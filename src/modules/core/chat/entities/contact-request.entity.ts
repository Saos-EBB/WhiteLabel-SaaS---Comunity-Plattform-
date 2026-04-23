import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ContactRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
}

@Entity('contact_requests')
export class ContactRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'sender_id' })
    sender_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' })
    sender!: User;

    @Column({ name: 'receiver_id' })
    receiver_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'receiver_id' })
    receiver!: User;

    @Column({ type: 'varchar', length: 300, nullable: true })
    message_preview!: string | null;

    @Column({ type: 'enum', enum: ContactRequestStatus, default: ContactRequestStatus.PENDING })
    status!: ContactRequestStatus;

    @CreateDateColumn()
    created_at!: Date;
}
