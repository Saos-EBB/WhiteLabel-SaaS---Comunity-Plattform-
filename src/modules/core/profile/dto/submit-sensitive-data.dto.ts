import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class SubmitSensitiveDataDto {
    @IsUUID()
    consent_id!: string;

    @IsString()
    disability_type!: string;

    @IsBoolean()
    disability_visible!: boolean;
}
