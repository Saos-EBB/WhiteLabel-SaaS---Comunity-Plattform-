import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('interests')
export class Interest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    name_de!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    name_en!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    category!: string | null;
}
