import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('strikes')
export class Strike {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid', nullable: true })
    report_id!: string | null;

    @Column({ type: 'uuid' })
    issued_by!: string;

    @Column({ type: 'varchar', length: 50 })
    type!: string;

    @Column({ type: 'text', nullable: true })
    reason!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    expires_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    ban_lifted_at!: Date | null;

    @Column({ type: 'boolean', default: false })
    lifted_by_job!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
