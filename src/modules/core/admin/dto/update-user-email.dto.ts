import { IsEmail } from 'class-validator';

export class UpdateUserEmailDto {
    @IsEmail()
    new_email!: string;
}
