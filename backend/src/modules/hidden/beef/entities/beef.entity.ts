import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';

export enum BeefStatus {
    PENDING_APPROVAL = 'pending_approval',
    WAITING = 'waiting',
    ACTIVE = 'active',
    CLOSED = 'closed',
    CHICKENED = 'chickened',
}

@Entity('beefs')
export class Beef {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'initiator_id' })
    initiator_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'initiator_id' })
    initiator!: User;

    @Column({ name: 'target_id' })
    target_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'target_id' })
    target!: User;

    @Column({ type: 'varchar', length: 50 })
    tldr!: string;

    @Column({ type: 'text' })
    chat_passage!: string;

    @Column({ type: 'varchar', length: 20, default: BeefStatus.PENDING_APPROVAL })
    status!: string;

    @Column({ type: 'boolean', default: false })
    admin_approved!: boolean;

    @Column({ name: 'winner_id', type: 'uuid', nullable: true })
    winner_id!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'winner_id' })
    winner!: User | null;

    @Column({ type: 'int', default: 86400 })
    duration_seconds!: number;

    @Column({ type: 'timestamptz', nullable: true })
    ends_at!: Date | null;

    @CreateDateColumn()
    created_at!: Date;
}
