import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum FileType {
    IMAGE = 'image',
    AUDIO = 'audio',
}

export enum FileContext {
    PROFILE = 'profile',
    CHAT    = 'chat',
    ORG     = 'org',
}

export enum ModerationStatus {
    PENDING  = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('media_uploads')
export class MediaUpload {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    uploaded_by!: string;

    @Column({ type: 'varchar' })
    file_url!: string;

    @Column({ type: 'enum', enum: FileType })
    file_type!: FileType;

    @Column({ type: 'varchar', nullable: true })
    file_use_for!: string | null;

    @Column({ type: 'enum', enum: FileContext })
    context!: FileContext;

    @Column({ type: 'uuid', nullable: true })
    conversation_id!: string | null;

    @Column({ type: 'uuid', nullable: true })
    org_id!: string | null;

    @Column({ type: 'enum', enum: ModerationStatus, default: ModerationStatus.PENDING })
    moderation_status!: ModerationStatus;

    @Column({ type: 'boolean', default: false })
    is_encrypted!: boolean;

    @Column({ type: 'integer' })
    file_size_kb!: number;

    @CreateDateColumn({ type: 'timestamptz', name: 'uploaded_at' })
    uploaded_at!: Date;

    @Column({ type: 'boolean', default: true })
    needs_review!: boolean;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    reviewed_at!: Date | null;

    @Column({ type: 'uuid', nullable: true, default: null })
    reviewed_by!: string | null;

    @Column({ type: 'text', nullable: true, default: null })
    review_rejected_reason!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    purged_at!: Date | null;
}
