import { IsString, IsUUID, MaxLength, MinLength, IsOptional, IsNumber, Min, Max } from 'class-validator';

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
}
