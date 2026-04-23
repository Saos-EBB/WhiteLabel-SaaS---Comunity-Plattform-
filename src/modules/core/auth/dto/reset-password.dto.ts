import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(64)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/,
        { message: 'Passwort braucht: Großbuchstabe, Kleinbuchstabe, Zahl, Sonderzeichen' }
    )
    password!: string;
}
