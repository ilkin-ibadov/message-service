import { Controller, Post, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotDto } from './dto/forgot.dto';
import { ResetDto } from './dto/reset.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private usersService: UserService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.usersService.createUser(dto.email, dto.password, dto.name);
        const { token } = await this.usersService.createEmailVerification(user);
        // NOTE: token returned only in dev; in prod don't return token
        return { message: 'User created. Check email for verification.' };
    }

    @Get('verify-email')
    async verify(@Query('token') token: string) {
        if (!token) throw new BadRequestException('Token is required');
        await this.usersService.confirmEmail(token);
        return { message: 'Email verified successfully.' };
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        // ip/device could be provided by client or extracted from request in production
        return this.authService.login(dto.email, dto.password, dto.ip, dto.device);
    }

    @Post('refresh')
    async refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('forgot')
    async forgot(@Body() dto: ForgotDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) return { message: 'If that email exists, a reset link was sent.' };
        await this.usersService.createPasswordReset(user);
        return { message: 'If that email exists, a reset link was sent.' };
    }

    @Post('reset')
    async reset(@Body() dto: ResetDto) {
        await this.usersService.resetPassword(dto.token, dto.newPassword);
        return { message: 'Password reset successful.' };
    }

    @Post('logout')
    async logout(@Body() dto: RefreshDto) {
        await this.authService.logout(dto.refreshToken);
        return { message: 'Logged out' };
    }
}
