import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';
import { Beef } from '../../beef/entities/beef.entity';

@Entity('badges')
export class Badge {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'beef_id' })
    beef_id!: string;

    @ManyToOne(() => Beef, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef;

    @Column({ type: 'varchar', length: 10 })
    type!: string; // 'winner' | 'loser' | 'chicken'

    @Column({ type: 'timestamptz' })
    expires_at!: Date;

    @CreateDateColumn()
    created_at!: Date;
}
