import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private resend = new Resend(process.env.RESEND_API_KEY);

    async sendVerificationEmail(to: string, token: string) {
        const link = `${process.env.APP_URL}/auth/verify?token=${token}`;

        await this.resend.emails.send({
            from: 'noreply@paarship.at',
            to,
            subject: 'Email bestätigen – Paarship',
            html: `
        <h2>Willkommen bei Paarship!</h2>
        <p>Bitte bestätige deine Email-Adresse:</p>
        <a href="${link}">Email bestätigen</a>
        <p>Der Link ist 24 Stunden gültig.</p>
      `,
        });
    }

    async sendPasswordResetEmail(to: string, token: string) {
        const link = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

        await this.resend.emails.send({
            from: 'noreply@paarship.at',
            to,
            subject: 'Passwort zurücksetzen – Paarship',
            html: `
        <h2>Passwort zurücksetzen</h2>
        <p>Klick auf den Link um dein Passwort zurückzusetzen:</p>
        <a href="${link}">Passwort zurücksetzen</a>
        <p>Der Link ist 1 Stunde gültig.</p>
      `,
        });
    }
}