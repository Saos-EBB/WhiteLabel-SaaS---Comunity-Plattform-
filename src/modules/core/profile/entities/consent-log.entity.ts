import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AgbVersion } from './agb-version.entity';

@Entity('consent_logs')
export class ConsentLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'agb_version_id' })
    agb_version_id!: string;

    @ManyToOne(() => AgbVersion, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'agb_version_id' })
    agb_version!: AgbVersion;

    @Column({ type: 'boolean' })
    accepted!: boolean;

    @Column({ type: 'timestamptz' })
    accepted_at!: Date;

    @Column({ type: 'varchar', length: 64 })
    ip_hash!: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    tp_hash!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    withdrawn_at!: Date | null;

    @Column({ type: 'text', nullable: true })
    withdraw_reason!: string | null;
}
