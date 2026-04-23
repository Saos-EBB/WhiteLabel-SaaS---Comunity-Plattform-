import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ReportReason {
    HARASSMENT = 'harassment',
    SPAM = 'spam',
    FAKE = 'fake',
    SEXUAL = 'sexual',
    ABUSE = 'abuse',
}

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'reporter_id' })
    reporter_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter!: User;

    @Column({ name: 'reported_user_id' })
    reported_user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reported_user_id' })
    reported_user!: User;

    @Column({ type: 'uuid', nullable: true })
    message_id!: string | null;

    @Column({ type: 'varchar', length: 50 })
    reason!: ReportReason;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 50, default: 'open' })
    status!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    intent_category!: string | null;

    @Column({ type: 'uuid', nullable: true })
    reviewed_by!: string | null;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    reviewed_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at!: Date | null;
}
