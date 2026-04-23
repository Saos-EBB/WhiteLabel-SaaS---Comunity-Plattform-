import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
    @IsOptional()
    @IsBoolean()
    email_messages?: boolean;

    @IsOptional()
    @IsBoolean()
    email_matches?: boolean;

    @IsOptional()
    @IsBoolean()
    email_system?: boolean;

    @IsOptional()
    @IsBoolean()
    push_messages?: boolean;

    @IsOptional()
    @IsBoolean()
    push_matches?: boolean;

    @IsOptional()
    @IsBoolean()
    push_system?: boolean;
}
