import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cities')
export class City {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'varchar', length: 100 })
    country!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    region!: string | null;

    @Column({ type: 'integer', nullable: true })
    population!: number | null;

    @Column({ type: 'decimal', precision: 9, scale: 6 })
    lat!: number;

    @Column({ type: 'decimal', precision: 9, scale: 6 })
    lng!: number;

    @Column({ type: 'boolean', default: false })
    is_capital!: boolean;
}
