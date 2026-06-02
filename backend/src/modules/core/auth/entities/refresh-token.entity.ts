import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'user_id' })
    user_id!: string;

    @Column({ type: 'varchar', length: 64, unique: true })
    token_hash!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    device_info!: string | null;

    @Column({ type: 'boolean', default: false })
    is_revoked!: boolean;

    @Column({ type: 'timestamptz' })
    expires_at!: Date;

    @CreateDateColumn()
    created_at!: Date;
}