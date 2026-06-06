import { IsObject } from 'class-validator';

export class GameMoveDto {
    @IsObject()
    move!: Record<string, any>;
}
