import { Injectable } from "@nestjs/common";
import AWS from 'aws-sdk'
import nodemailer from 'nodemailer'

@Injectable()
export class MailService {
    private useSes = false;
    private ses: AWS.SES;
    private transporter: nodemailer.Transporter | null = null

    constructor() {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.useSes = true
            AWS.config.update({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            })
            this.ses = new AWS.SES({ apiVersion: '2010-12-01' })
            console.log('MailService: using AWS SES')
        } else {
            // fallback to nodemailer SMTP
            this.transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: Number(process.env.MAIL_PORT || 587),
                secure: process.env.MAIL_SECURE === 'true',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            })
            console.log('MailService: using SMTP fallback')
        }
    }

    async sendMail(to: string, subject: string, html: string) {
        if (this.useSes) {
            const params = {
                Destination: { ToAddresses: [to] },
                Message: {
                    Body: { Html: { Charset: 'UTF-8', Data: html } },
                    Subject: { Charset: 'UTF-8', Data: subject }
                },
                Source: process.env.MAIL_FROM || 'no-reply@yourapp.com'
            }
            return this.ses.sendEmail(params).promise()
        } else {
            if (!this.transporter) throw new Error('No mail transporter configured')
            return this.transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html })
        }
    }
}