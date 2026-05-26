import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
    @IsString()
    current_password!: string;

    @IsEmail()
    new_email!: string;
}
