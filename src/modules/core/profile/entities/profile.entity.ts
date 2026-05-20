import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum FontSizeOption {
    NORMAL = 'normal',
    LARGE = 'large',
    XL = 'xl',
}

export enum GenderOption {
    MALE          = 'male',
    FEMALE        = 'female',
    NON_BINARY    = 'non_binary',
    DIVERSE       = 'diverse',
    NOT_SPECIFIED = 'not_specified',
}

export enum LookingForOption {
    FRIENDSHIP   = 'friendship',
    RELATIONSHIP = 'relationship',
    EXCHANGE     = 'exchange',
    ALL          = 'all',
}

export enum StatusMessageOption {
    AVAILABLE        = 'available',
    LOOKING_FOR_CHAT = 'looking_for_chat',
    LOOKING_FOR_DATE = 'looking_for_date',
    BUSY             = 'busy',
    DO_NOT_DISTURB   = 'do_not_disturb',
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

    @Column({ type: 'enum', enum: GenderOption, nullable: true, default: null })
    gender!: GenderOption | null;

    @Column({ type: 'enum', enum: LookingForOption, nullable: true, default: null })
    looking_for!: LookingForOption | null;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    last_active_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    nickname_changed_at!: Date | null;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    gender_changed_at!: Date | null;

    @Column({ type: 'boolean', default: true })
    profanity_filter!: boolean;

    @Column({ type: 'boolean', default: true })
    status_visible!: boolean;

    @Column({ type: 'enum', enum: StatusMessageOption, nullable: true, default: null })
    status_message!: StatusMessageOption | null;

    @Column({ type: 'timestamptz' })
    updated_at!: Date;
}
