import { IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum StrikeType {
    WARNING = 'warning',
    TEMP = 'temp',
    PERMANENT = 'permanent',
}

export class CreateStrikeDto {
    @IsUUID()
    user_id!: string;

    @IsUUID()
    report_id!: string;

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
