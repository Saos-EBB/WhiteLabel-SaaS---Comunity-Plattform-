import { IsEnum, IsUUID } from 'class-validator';
import { SwipeAction } from '../entities/swipe.entity';

export class SwipeDto {
    @IsUUID()
    target_user_id!: string;

    @IsEnum(SwipeAction)
    action!: SwipeAction;
}
