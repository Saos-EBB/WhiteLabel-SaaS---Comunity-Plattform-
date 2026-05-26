import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsString()
    @MaxLength(30)
    nickname!: string;
}
