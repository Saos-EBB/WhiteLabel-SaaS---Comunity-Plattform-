import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(64)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        { message: 'Passwort braucht: Großbuchstabe, Kleinbuchstabe, Zahl, Sonderzeichen' }
    )
    password!: string;
}