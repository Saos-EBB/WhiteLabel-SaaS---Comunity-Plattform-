import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export type BanDuration = '24h' | '7d' | '30d' | 'permanent';

export class BanUserDto {
    @IsIn(['24h', '7d', '30d', 'permanent'])
    duration!: BanDuration;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    reason!: string;

    @IsOptional()
    @IsUUID()
    report_id?: string;
}
