import { IsString, MinLength, MaxLength } from 'class-validator';

export class CommentBeefDto {
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    content!: string;
}
