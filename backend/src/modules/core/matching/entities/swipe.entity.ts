import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum SwipeAction {
    LIKE = 'like',
    SKIP = 'skip',
}

@Entity('swipes')
export class Swipe {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'swiper_id' })
    swiper_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'swiper_id' })
    swiper!: User;

    @Column({ name: 'swiped_id' })
    swiped_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'swiped_id' })
    swiped!: User;

    @Column({ type: 'varchar', length: 10 })
    action!: SwipeAction;

    @CreateDateColumn({ name: 'swiped_at', type: 'timestamptz' })
    swiped_at!: Date;
}
