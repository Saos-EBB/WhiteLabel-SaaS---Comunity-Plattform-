import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum FontSizeOption {
    NORMAL = 'normal',
    LARGE = 'large',
    XL = 'xl',
}

@Entity('profiles')
export class Profile {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 30, unique: true })
    nickname!: string;

    @Column({ type: 'date' })
    birthdate!: string;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;

    @Column({ type: 'uuid', nullable: true })
    photo_id!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city!: string | null;

    // PostGIS geography — never exposed via API, managed by DB only
    @Column({ type: 'text', nullable: true, select: false, update: false, insert: false })
    location!: any;

    @Column({ type: 'integer', default: 20 })
    search_radius_km!: number;

    @Column({ type: 'boolean', default: false })
    lang_simple!: boolean;

    @Column({ type: 'enum', enum: FontSizeOption, default: FontSizeOption.NORMAL })
    font_size!: FontSizeOption;

    @Column({ type: 'boolean', default: false })
    high_contrast!: boolean;

    @Column({ type: 'boolean', default: false })
    is_published!: boolean;

    @Column({ type: 'boolean', default: false })
    onboarding_completed!: boolean;

    @Column({ type: 'timestamptz' })
    updated_at!: Date;
}
