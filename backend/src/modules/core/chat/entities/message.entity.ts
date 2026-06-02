import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    AUDIO = 'audio',
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'conversation_id' })
    conversation_id!: string;

    @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation!: Conversation;

    @Column({ name: 'sender_id' })
    sender_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' })
    sender!: User;

    @Column({ type: 'text', nullable: true })
    content!: string | null;

    @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
    type!: MessageType;

    @Column({ type: 'uuid', nullable: true })
    media_id!: string | null;

    @Column({ type: 'boolean', default: false })
    is_deleted!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'boolean', default: false })
    flagged!: boolean;

    @Column({ name: 'flagged_by', type: 'uuid', nullable: true })
    flagged_by!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    flagged_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    read_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    purged_at!: Date | null;

    @CreateDateColumn({ name: 'sent_at' })
    sent_at!: Date;
}
