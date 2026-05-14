import {
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ContactRequest, ContactRequestStatus } from './entities/contact-request.entity';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';
import { SendContactRequestDto } from './dto/send-contact-request.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(ContactRequest)
        private readonly contactRequestRepository: Repository<ContactRequest>,
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) { }

    async sendContactRequest(senderId: string, dto: SendContactRequestDto) {
        if (senderId === dto.receiver_id) {
            throw new BadRequestException('Anfrage an sich selbst nicht erlaubt');
        }

        const receiver = await this.userRepository.findOne({
            where: { id: dto.receiver_id, deleted_at: IsNull() },
        });
        if (!receiver) throw new NotFoundException('Benutzer nicht gefunden');

        const existing = await this.contactRequestRepository.findOne({
            where: { sender_id: senderId, receiver_id: dto.receiver_id, status: ContactRequestStatus.PENDING },
        });
        if (existing) throw new ConflictException('Anfrage bereits gesendet');

        const request = this.contactRequestRepository.create({
            sender_id: senderId,
            receiver_id: dto.receiver_id,
            message_preview: dto.message_preview ?? null,
        });

        return this.contactRequestRepository.save(request);
    }

    async getIncomingRequests(userId: string) {
        return this.contactRequestRepository.find({
            where: { receiver_id: userId, status: ContactRequestStatus.PENDING },
            order: { created_at: 'DESC' },
        });
    }

    async getOutgoingRequests(userId: string) {
        return this.contactRequestRepository.find({
            where: { sender_id: userId },
            order: { created_at: 'DESC' },
        });
    }

    async acceptRequest(userId: string, requestId: string) {
        const request = await this.contactRequestRepository.findOne({
            where: { id: requestId },
        });

        if (!request) throw new NotFoundException('Anfrage nicht gefunden');
        if (request.receiver_id !== userId) throw new ForbiddenException('Keine Berechtigung');
        if (request.status !== ContactRequestStatus.PENDING) {
            throw new ConflictException('Anfrage ist nicht mehr ausstehend');
        }

        request.status = ContactRequestStatus.ACCEPTED;
        await this.contactRequestRepository.save(request);

        const conversation = this.conversationRepository.create({
            user_a_id: request.sender_id,
            user_b_id: request.receiver_id,
            contact_request_id: request.id,
        });

        return this.conversationRepository.save(conversation);
    }

    async declineRequest(userId: string, requestId: string) {
        const request = await this.contactRequestRepository.findOne({
            where: { id: requestId },
        });

        if (!request) throw new NotFoundException('Anfrage nicht gefunden');
        if (request.receiver_id !== userId) throw new ForbiddenException('Keine Berechtigung');
        if (request.status !== ContactRequestStatus.PENDING) {
            throw new ConflictException('Anfrage ist nicht mehr ausstehend');
        }

        await this.contactRequestRepository.update(requestId, { status: ContactRequestStatus.DECLINED });
        return { message: 'Anfrage abgelehnt' };
    }

    async getConversations(userId: string) {
        const conversations = await this.conversationRepository.find({
            where: [
                { user_a_id: userId, deleted_at_a: IsNull() },
                { user_b_id: userId, deleted_at_b: IsNull() },
            ],
            order: { created_at: 'DESC' },
        });

        if (conversations.length === 0) return [];

        const ids = conversations.map(c => c.id);

        const latestMessages = await this.messageRepository
            .createQueryBuilder('msg')
            .where('msg.conversation_id IN (:...ids)', { ids })
            .andWhere(qb => {
                const sub = qb
                    .subQuery()
                    .select('MAX(m2.sent_at)')
                    .from(Message, 'm2')
                    .where('m2.conversation_id = msg.conversation_id')
                    .getQuery();
                return `msg.sent_at = (${sub})`;
            })
            .getMany();

        const latestByConversation = new Map(latestMessages.map(m => [m.conversation_id, m]));

        return conversations.map(conv => {
            const latest = latestByConversation.get(conv.id);
            return {
                ...conv,
                last_message_content: latest && !latest.is_deleted ? latest.content : null,
                last_message_sender_id: latest?.sender_id ?? null,
                last_message_at: latest?.sent_at ?? null,
                read_at: latest?.read_at ?? null,
            };
        }).sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
        });
    }

    async deleteConversation(userId: string, conversationId: string) {
        const conversation = await this.verifyConversationAccess(userId, conversationId);
        const now = new Date();

        if (conversation.user_a_id === userId) {
            conversation.deleted_at_a = now;
        } else {
            conversation.deleted_at_b = now;
        }

        if (conversation.deleted_at_a && conversation.deleted_at_b) {
            conversation.purged_at = now;
        }

        await this.conversationRepository.save(conversation);
        return { message: 'Konversation gelöscht' };
    }

    async getConversation(userId: string, conversationId: string) {
        const conversation = await this.conversationRepository.findOne({
            where: [
                { id: conversationId, user_a_id: userId },
                { id: conversationId, user_b_id: userId },
            ],
        });

        if (!conversation) throw new NotFoundException('Konversation nicht gefunden');
        return conversation;
    }

    async getMessages(userId: string, conversationId: string) {
        await this.verifyConversationAccess(userId, conversationId);

        const messages = await this.messageRepository.find({
            where: { conversation_id: conversationId },
            order: { sent_at: 'ASC' },
        });

        await this.messageRepository.update(
            { conversation_id: conversationId, sender_id: Not(userId), read_at: IsNull() },
            { read_at: new Date() },
        );

        return messages.map(msg => ({
            ...msg,
            content: msg.is_deleted ? null : msg.content,
        }));
    }

    async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
        await this.verifyConversationAccess(userId, conversationId);

        const message = this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: userId,
            content: dto.content ?? null,
            type: dto.type ?? MessageType.TEXT,
        });

        return this.messageRepository.save(message);
    }

    async deleteMessage(userId: string, messageId: string) {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });

        if (!message) throw new NotFoundException('Nachricht nicht gefunden');
        if (message.sender_id !== userId) throw new ForbiddenException('Keine Berechtigung');

        await this.messageRepository.update(messageId, {
            is_deleted: true,
            deleted_at: new Date(),
        });

        return { message: 'Nachricht gelöscht' };
    }

    private async verifyConversationAccess(userId: string, conversationId: string) {
        const conversation = await this.conversationRepository.findOne({
            where: [
                { id: conversationId, user_a_id: userId },
                { id: conversationId, user_b_id: userId },
            ],
        });

        if (!conversation) throw new NotFoundException('Konversation nicht gefunden');
        return conversation;
    }
}
