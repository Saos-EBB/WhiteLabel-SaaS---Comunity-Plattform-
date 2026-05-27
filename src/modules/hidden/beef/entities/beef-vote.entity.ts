import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';
import { Beef } from './beef.entity';

@Entity('beef_votes')
export class BeefVote {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'beef_id' })
    beef_id!: string;

    @ManyToOne(() => Beef, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef;

    @Column({ name: 'voter_id' })
    voter_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'voter_id' })
    voter!: User;

    @Column({ type: 'varchar', length: 10 })
    side!: string; // 'initiator' | 'target'

    @Column({ type: 'int', default: 1 })
    coins_wagered!: number;

    @CreateDateColumn()
    created_at!: Date;
}
