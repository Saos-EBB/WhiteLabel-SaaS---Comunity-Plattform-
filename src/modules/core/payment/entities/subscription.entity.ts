import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 50 })
    plan!: string;

    @Column({ type: 'varchar', length: 50 })
    status!: string;

    @Column({ type: 'varchar', length: 50 })
    payment_provider!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_subscription_id!: string | null;

    @Column({ type: 'timestamptz' })
    started_at!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    expires_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    cancelled_at!: Date | null;
}
