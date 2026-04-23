import { FontSizeOption } from '../entities/profile.entity';
export declare class UpdateProfileDto {
    nickname?: string;
    bio?: string;
    city?: string;
    lang_simple?: boolean;
    font_size?: FontSizeOption;
    high_contrast?: boolean;
    search_radius_km?: number;
}
