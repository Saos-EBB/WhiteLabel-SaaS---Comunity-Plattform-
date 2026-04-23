import { User } from '../../auth/entities/user.entity';
export declare enum FontSizeOption {
    NORMAL = "normal",
    LARGE = "large",
    XL = "xl"
}
export declare class Profile {
    id: string;
    user_id: string;
    user: User;
    nickname: string;
    birthdate: string;
    bio: string | null;
    photo_id: string | null;
    city: string | null;
    location: any;
    search_radius_km: number;
    lang_simple: boolean;
    font_size: FontSizeOption;
    high_contrast: boolean;
    is_published: boolean;
    onboarding_completed: boolean;
    updated_at: Date;
}
