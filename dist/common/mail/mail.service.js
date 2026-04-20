"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const resend_1 = require("resend");
let MailService = class MailService {
    resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    async sendVerificationEmail(to, token) {
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
    async sendPasswordResetEmail(to, token) {
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
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)()
], MailService);
//# sourceMappingURL=mail.service.js.map