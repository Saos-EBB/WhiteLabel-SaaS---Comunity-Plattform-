import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';
import { Beef } from '../../beef/entities/beef.entity';

@Entity('coin_transactions')
export class CoinTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int' })
    amount!: number; // positive = earned, negative = spent

    @Column({ type: 'varchar', length: 30 })
    type!: string;

    @Column({ name: 'beef_id', type: 'uuid', nullable: true })
    beef_id!: string | null;

    @ManyToOne(() => Beef, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef | null;

    @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true, unique: true })
    idempotency_key!: string | null;

    @CreateDateColumn()
    created_at!: Date;
}
