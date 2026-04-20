import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
    email_search_hash!: string | null;

    @Column({ type: 'varchar', nullable: true })
    password_hash!: string | null;

    @Column({ type: 'varchar', nullable: true })
    google_id_hash!: string | null;

    @Column({ type: 'enum', enum: ['user', 'admin', 'org'], default: 'user' })
    role!: string;

    @Column({ type: 'boolean', default: false })
    is_verified!: boolean;

    @Column({ type: 'boolean', default: false })
    is_banned!: boolean;

    @Column({ type: 'boolean', default: false })
    vulnerable_flag!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    pseudonymized_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    email_verified_at!: Date | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    email_verification_token!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    email_verification_expires_at!: Date | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    password_reset_token!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    password_reset_expires_at!: Date | null;

}