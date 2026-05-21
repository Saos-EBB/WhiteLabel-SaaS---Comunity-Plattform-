import { IsDate, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class BanUserDto {
    @IsString()
    @MinLength(5)
    @MaxLength(500)
    reason!: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    expires_at?: Date;
}
