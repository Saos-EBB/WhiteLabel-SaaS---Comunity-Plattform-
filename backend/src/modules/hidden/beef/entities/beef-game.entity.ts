import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Beef } from './beef.entity';
import { User } from '../../../../core/auth/entities/user.entity';

@Entity('beef_games')
export class BeefGame {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'beef_id' })
    beef_id!: string;

    @ManyToOne(() => Beef, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef;

    @Column({ type: 'varchar', length: 30 })
    game_type!: string;

    @Column({ type: 'jsonb', default: {} })
    state!: Record<string, any>;

    @Column({ type: 'timestamptz', nullable: true })
    move_deadline_at!: Date | null;

    @Column({ type: 'boolean', default: false })
    initiator_ready!: boolean;

    @Column({ type: 'boolean', default: false })
    target_ready!: boolean;

    @Column({ name: 'winner_id', type: 'uuid', nullable: true })
    winner_id!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'winner_id' })
    winner!: User | null;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
