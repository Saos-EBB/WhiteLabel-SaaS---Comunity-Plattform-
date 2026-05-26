import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactSupportDto {
    @IsEmail()
    @MaxLength(255)
    email: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    nickname?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    public_id?: string;

    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    message: string;
}
