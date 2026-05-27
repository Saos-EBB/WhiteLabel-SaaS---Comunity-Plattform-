import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../core/auth/entities/user.entity';
import { Beef } from '../../beef/entities/beef.entity';

@Entity('teeth')
export class Tooth {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'owner_id' })
    owner_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner!: User;

    @Column({ name: 'from_user_id' })
    from_user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'from_user_id' })
    from_user!: User;

    @Column({ name: 'beef_id' })
    beef_id!: string;

    @ManyToOne(() => Beef, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'beef_id' })
    beef!: Beef;

    @Column({ type: 'boolean', default: false })
    converted_to_chain!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
