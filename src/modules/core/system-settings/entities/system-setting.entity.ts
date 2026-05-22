import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
    @PrimaryColumn({ type: 'varchar', length: 100 })
    key!: string;

    @Column({ type: 'text' })
    value!: string;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    updated_at!: Date;

    @Column({ type: 'uuid', nullable: true })
    updated_by!: string | null;
}
