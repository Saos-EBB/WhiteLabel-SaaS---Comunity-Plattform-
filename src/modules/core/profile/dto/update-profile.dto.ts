import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { FontSizeOption, GenderOption, LookingForOption, StatusMessageOption } from '../entities/profile.entity';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_\-\.]{3,30}$/, {
        message: 'nickname darf nur Buchstaben, Ziffern, _, - und . enthalten',
    })
    nickname?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    bio?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsBoolean()
    lang_simple?: boolean;

    @IsOptional()
    @IsEnum(FontSizeOption)
    font_size?: FontSizeOption;

    @IsOptional()
    @IsBoolean()
    high_contrast?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(500)
    search_radius_km?: number;

    @IsOptional()
    @IsDateString()
    birthdate?: string;

    @IsOptional()
    @IsBoolean()
    is_published?: boolean;

    @IsOptional()
    @IsEnum(GenderOption)
    gender?: GenderOption;

    @IsOptional()
    @IsEnum(LookingForOption)
    looking_for?: LookingForOption;

    @IsOptional()
    @IsBoolean()
    status_visible?: boolean;

    @IsOptional()
    @IsEnum(StatusMessageOption)
    status_message?: StatusMessageOption;
}
