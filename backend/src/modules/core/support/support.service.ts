import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSupportDto } from './dto/contact-support.dto';

@Injectable()
export class SupportService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async createSupportTicket(dto: ContactSupportDto): Promise<void> {
        const context = {
            email:     dto.email,
            nickname:  dto.nickname  ?? null,
            public_id: dto.public_id ?? null,
            message:   dto.message,
        };

        await this.dataSource.query(
            `INSERT INTO admin_tickets (type, source, context) VALUES ('support_request', 'login_screen', $1)`,
            [JSON.stringify(context)],
        );
        this.eventEmitter.emit('ticket.new', {});
    }
}
