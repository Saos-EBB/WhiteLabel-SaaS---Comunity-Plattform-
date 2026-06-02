import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('blocks')
@Unique(['blocker_id', 'blocked_id'])
export class Block {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    blocker_id!: string;

    @Column({ type: 'uuid' })
    blocked_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocker_id' })
    blocker!: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocked_id' })
    blocked!: User;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at!: Date;
}
