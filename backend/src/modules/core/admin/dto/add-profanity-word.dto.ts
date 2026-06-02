import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddProfanityWordDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Matches(/^\S+$/, { message: 'word must not contain whitespace' })
    word!: string;
}
