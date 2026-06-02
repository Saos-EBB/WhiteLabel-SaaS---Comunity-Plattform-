import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum AgbType {
    AGB = 'agb',
    PRIVACY = 'privacy',
    SENSITIVE_DATA = 'sensitive_data',
}

@Entity('agb_versions')
export class AgbVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 20 })
    version!: string;

    @Column({ type: 'enum', enum: AgbType })
    type!: AgbType;

    @Column({ type: 'text' })
    content_normal!: string;

    @Column({ type: 'text' })
    content_simple!: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    content_url!: string | null;

    @Column({ type: 'timestamptz' })
    valid_from!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    valid_until!: Date | null;

    @Column({ type: 'boolean' })
    is_current!: boolean;
}
