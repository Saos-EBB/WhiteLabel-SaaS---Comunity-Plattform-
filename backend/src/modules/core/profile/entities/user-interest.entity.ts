import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Interest } from './interest.entity';

@Entity('user_interests')
export class UserInterest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'interest_id' })
    interest_id!: string;

    @ManyToOne(() => Interest, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'interest_id' })
    interest!: Interest;

    @Column({ type: 'boolean', default: true })
    is_green!: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at!: Date;
}
