import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('payment_logs')
export class PaymentLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid', nullable: true })
    subscription_id!: string | null;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount!: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
    tax_amount!: number | null;

    @Column({ type: 'varchar', length: 10 })
    currency!: string;

    @Column({ type: 'varchar', length: 50 })
    status!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_tx_id!: string | null;

    @CreateDateColumn()
    created_at!: Date;
}
