import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';
import { Beef } from './beef.entity';

@Entity('beef_comments')
export class BeefComment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'beef_id' })
    beef_id!: string;

    @ManyToOne(() => Beef, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'text' })
    content!: string;

    @CreateDateColumn()
    created_at!: Date;
}
