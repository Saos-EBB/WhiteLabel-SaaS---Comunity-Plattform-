import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type NotificationType =
    'message' | 'match' | 'system' | 'ban' | 'request' |
    'beef_request' | 'beef_accepted' | 'beef_won' | 'beef_lost';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    type!: string;

    @Column({ nullable: true })
    content!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title!: string | null;

    @Column({ type: 'text', nullable: true })
    related_id!: string | null;

    @Column({ default: false })
    is_read!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
