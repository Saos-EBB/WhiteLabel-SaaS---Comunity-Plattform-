import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ContactRequest } from './contact-request.entity';

export enum ConversationStatus {
    ACTIVE = 'active',
    BLOCKED = 'blocked',
    ARCHIVED = 'archived',
}

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_a_id' })
    user_a_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_a_id' })
    user_a!: User;

    @Column({ name: 'user_b_id' })
    user_b_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_b_id' })
    user_b!: User;

    @Column({ name: 'contact_request_id', type: 'uuid', nullable: true })
    contact_request_id!: string | null;

    @ManyToOne(() => ContactRequest, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'contact_request_id' })
    contact_request!: ContactRequest | null;

    @Column({ type: 'varchar', length: 50, default: ConversationStatus.ACTIVE })
    status!: string;

    @Column({ type: 'boolean', default: true })
    images_enabled!: boolean;

    @Column({ type: 'boolean', default: true })
    audio_enabled!: boolean;

    @Column({ type: 'boolean', default: true })
    video_enabled!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    last_message_at!: Date | null;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    purged_at!: Date | null;
}
