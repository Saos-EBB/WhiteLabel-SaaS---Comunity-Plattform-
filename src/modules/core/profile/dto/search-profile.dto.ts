import { IsOptional, IsString, IsArray, IsUUID } from "class-validator";
import { Transform } from 'class-transformer';

export class SearchProfileDto {
    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    interests?: string[];
}

