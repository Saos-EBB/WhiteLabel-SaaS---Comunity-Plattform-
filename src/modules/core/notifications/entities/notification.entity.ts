import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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

    @Column({ default: false })
    is_read!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
