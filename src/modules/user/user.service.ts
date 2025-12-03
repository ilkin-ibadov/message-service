import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { EmailVerification } from "./email-verification.entity"
import { PasswordReset } from './password-reset.entity';
import { UserSession } from "./session.entity"
import * as bcrypt from 'bcrypt'
import { MailService } from '../mail/mail.service';
import { KafkaService } from '../kafka/kafka.service';
import { MongoService } from '../mongo/mongo.service';
import { randomBytes } from "crypto"
import { addSeconds } from "date-fns"

@Injectable()
export class UserService {
    private saltRounds = Number(process.env.SALT_ROUNDS || 12)
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(EmailVerification) private evRepo: Repository<EmailVerification>,
        @InjectRepository(PasswordReset) private prRepo: Repository<PasswordReset>,
        @InjectRepository(UserSession) private sessionRepo: Repository<UserSession>,
        private mailService: MailService,
        private kafkaService: KafkaService,
        private mongoService: MongoService
    ) { }

    async createUser(email: string, password: string, name?: string) {
        const existing = await this.userRepo.findOne({ where: { email } })
        if (existing) throw new BadRequestException('Email already in use')
        const passwordHash = await bcrypt.hash(password, this.saltRounds)
        const user = this.userRepo.create({ email, passwordHash, name })
        const saved = await this.userRepo.save(user)
        // emit kafka event
        this.kafkaService.produce('auth.user.created', { userId: saved.id, email: saved.email, createdAt: new Date() })
        await this.mongoService.log('info', 'User created', { userId: saved.id, email: saved.email })
        return saved
    }

    async findByEmail(email: string) {
        return this.userRepo.findOne({ where: { email } })
    }

    async findById(id: string) {
        return this.userRepo.findOne({ where: { id } })
    }

    async verifyPassword(user: User, pass: string) {
        return bcrypt.compare(pass, user.passwordHash)
    }

    private async hashToken(token: string) {
        return bcrypt.hash(token, this.saltRounds)
    }

    async createEmailVerification(user: User) {
        const token = randomBytes(32).toString('hex')
        const tokenHash = await this.hashToken(token)
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)
        const ev = this.evRepo.create({ tokenHash, user, expiresAt })
        await this.evRepo.save(ev)

        const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`
        const html = `<p>Verify your email by clicking <a href="${verifyUrl}">here</a>. Link expires in 24 hours.</p>`
        await this.mailService.sendMail(user.email, 'Verify your email', html)
        await this.mongoService.log('info', 'Verification created', { userId: user.id })
        return { ev, token }
    }

    async confirmEmail(token: string) {
        const all = await this.evRepo.find({ relations: ['user'] })
        for (const candidate of all) {
            const ok = await bcrypt.compare(token, candidate.tokenHash)
            if (ok) {
                if (candidate.expiresAt < new Date()) {
                    await this.evRepo.remove(candidate)
                    throw new BadRequestException('Token expired')
                }
                candidate.usedAt = new Date()
                await this.evRepo.save(candidate)
                candidate.user.isVerified = true
                await this.userRepo.save(candidate.user)
                await this.kafkaService.produce('auth.user.verified', { userId: candidate.user.id, verifiedAt: new Date() })
                await this.mongoService.log('info', 'User verified', { userId: candidate.user.id })
                return candidate.user
            }
        }

        throw new BadRequestException('Invalid token')
    }

    async createPasswordReset(user: User) {
        const token = randomBytes(32).toString('hex')
        const tokenHash = await this.hashToken(token)
        const expiresAt = addSeconds(new Date(), 60 * 60)
        const pr = this.prRepo.create({ tokenHash, user, expiresAt })
        await this.prRepo.save(pr)

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
        const html = `<p>Reset your password by clicking <a href="${resetUrl}">here</a>. Link expires in 1 hour.</p>`
        await this.mailService.sendMail(user.email, 'Reset your password', html)
        await this.mongoService.log('info', 'Password reset requested', { userId: user.id })
        return { pr, token }
    }

    async resetPassword(token: string, newPassword: string) {
        const all = await this.prRepo.find({ relations: ['user'] })
        for (const candidate of all) {
            const ok = await bcrypt.compare(token, candidate.tokenHash)
            if (ok) {
                if (candidate.expiresAt < new Date()) {
                    await this.prRepo.remove(candidate)
                    throw new BadRequestException('Token expired')
                }

                candidate.usedAt = new Date()
                await this.prRepo.save(candidate)
                candidate.user.passwordHash = await bcrypt.hash(newPassword, this.saltRounds)
                await this.userRepo.save(candidate.user)

                // revoke all sessions
                await this.sessionRepo.update({ userId: candidate.user.id, revoked: false }, { revoked: true, revokedAt: new Date() })
                await this.kafkaService.produce('auth.user.password.changed', { userId: candidate.user.id, changedAt: new Date() })
                await this.mongoService.log('info', 'Password changed via reset', { userId: candidate.user.id })
                return candidate.user
            }
        }
        throw new BadRequestException('Invalid token')
    }

    async createSession(user: User, refreshToken: string, ip?: string, device?: string) {
        const refreshTokenHash = await bcrypt.hash(refreshToken, this.saltRounds)
        const ttlStr = process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d'
        const ttlSeconds = this.parseExpiration(ttlStr)
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

        const session = this.sessionRepo.create({
            user,
            userId: user.id,
            refreshTokenHash,
            ip,
            device,
            createdAt: new Date(),
            expiresAt,
            revoked: false
        })

        const saved = await this.sessionRepo.save(session)
        await this.kafkaService.produce('auth.session.created', { sessionId: saved.id, userId: user.id, createdAt: saved.createdAt })
        await this.mongoService.log('info', 'Session created', { sessionId: saved.id, userId: user.id, ip, device })
        return saved
    }

    async revokeSession(sessionId: string) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
        if (!session) throw new NotFoundException('Session not found')
        session.revoked = true
        session.revokedAt = new Date()
        await this.sessionRepo.save(session)
        await this.kafkaService.produce('auth.session.revoked', { sessionId, revokedAt: session.revokedAt })
        await this.mongoService.log('info', 'Session revoked', { sessionId })
    }

    async findSessionByRefreshToken(refreshToken: string) {
        const sessions = await this.sessionRepo.find({ where: { revoked: false } })
        for (const s of sessions) {
            const ok = await bcrypt.compare(refreshToken, s.refreshTokenHash)
            if (ok) return s
        }
        return null
    }

    private parseExpiration(exp: string) {
        if (exp.endsWith('d')) return Number(exp.slice(0, -1)) * 86400
        if (exp.endsWith('h')) return Number(exp.slice(0, -1)) * 3600
        if (exp.endsWith('m')) return Number(exp.slice(0, -1)) * 60
        if (exp.endsWith('s')) return Number(exp.slice(0, -1))
        const n = Number(exp)
        return isNaN(n) ? 7 * 86400 : n
    }

    async listAll(){
        return this.userRepo.find({select: ['id', 'email', 'name', 'isVerified', 'createdAt']})
    }
}