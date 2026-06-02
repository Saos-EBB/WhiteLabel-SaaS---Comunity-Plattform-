import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('notification_settings')
export class NotificationSettings {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', unique: true })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'boolean', default: true })
    email_messages!: boolean;

    @Column({ type: 'boolean', default: true })
    email_matches!: boolean;

    @Column({ type: 'boolean', default: true })
    email_system!: boolean;

    @Column({ type: 'boolean', default: true })
    push_messages!: boolean;

    @Column({ type: 'boolean', default: true })
    push_matches!: boolean;

    @Column({ type: 'boolean', default: true })
    push_system!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    updated_at!: Date | null;
}
