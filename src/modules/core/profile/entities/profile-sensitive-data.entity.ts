import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ConsentLog } from './consent-log.entity';

@Entity('profile_sensitive_data')
export class ProfileSensitiveData {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'consent_id' })
    consent_id!: string;

    @ManyToOne(() => ConsentLog, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'consent_id' })
    consent!: ConsentLog;

    @Column({ type: 'bytea', nullable: true })
    disability_type!: Buffer | null;

    @Column({ type: 'boolean', default: false })
    disability_visible!: boolean;

    @Column({ type: 'timestamptz' })
    collected_at!: Date;

    @Column({ type: 'timestamptz' })
    updated_at!: Date;
}
