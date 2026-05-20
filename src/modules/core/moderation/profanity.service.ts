import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import leoProfanity from 'leo-profanity';
import { CUSTOM_WORDS_DE } from './profanity.wordlist';

@Injectable()
export class ProfanityService {
    private readonly logger = new Logger(ProfanityService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {
        leoProfanity.add(CUSTOM_WORDS_DE);
    }

    check(text: string): boolean {
        return leoProfanity.check(text);
    }

    blur(text: string): string {
        return leoProfanity.clean(text);
    }

    async flagUser(userId: string, word: string, contextType: 'chat' | 'bio' | 'status_message'): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO profanity_flags (user_id, word, context_type) VALUES ($1, $2, $3)`,
            [userId, word, contextType],
        );

        const [{ count }] = await this.dataSource.query<[{ count: string }]>(
            `SELECT COUNT(*) AS count FROM profanity_flags WHERE user_id = $1 AND flagged_at > NOW() - INTERVAL '24 hours'`,
            [userId],
        );

        if (parseInt(count, 10) >= 50) {
            this.logger.warn(`High profanity flag count for user ${userId}: ${count} flags in 24 h`);
        }
    }

    async createNicknameTicket(userId: string, nickname: string): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO admin_tickets (type, user_id, context) VALUES ('nickname', $1, $2)`,
            [userId, JSON.stringify({ nickname })],
        );
    }
}
