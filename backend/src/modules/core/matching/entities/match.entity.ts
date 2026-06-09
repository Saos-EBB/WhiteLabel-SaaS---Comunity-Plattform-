import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('matches')
export class Match {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_a_id' })
    user_a_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_a_id' })
    user_a!: User;

    @Column({ name: 'user_b_id' })
    user_b_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_b_id' })
    user_b!: User;

    @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
    conversation_id!: string | null;

    @ManyToOne(() => Conversation, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'conversation_id' })
    conversation!: Conversation | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at!: Date;
}
