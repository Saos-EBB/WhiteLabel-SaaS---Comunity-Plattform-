import { IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { StrikeType } from '../../moderation/dto/create-strike.dto';

export class AdminCreateStrikeDto {
    @IsUUID()
    user_id!: string;

    @IsEnum(StrikeType)
    type!: StrikeType;

    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    reason!: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    expires_at?: Date;
}
