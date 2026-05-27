import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';

@Entity('user_coin_balance')
export class UserCoinBalance {
    @PrimaryColumn({ name: 'user_id' })
    user_id!: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int', default: 0 })
    balance!: number;
}
