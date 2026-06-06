import { IsString, IsUUID, MaxLength, MinLength, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { GameType } from '../entities/beef.entity';

const VALID_GAME_TYPES = Object.values(GameType);

export class CreateBeefDto {
    @IsUUID()
    target_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(50)
    tldr!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    chat_passage!: string;

    @IsOptional()
    @IsNumber()
    @Min(900)
    @Max(172800)
    duration_seconds?: number;

    @IsOptional()
    @IsIn(VALID_GAME_TYPES)
    game_type?: string;
}
