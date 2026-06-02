import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateOwnerDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(30)
    nickname!: string;
}
