import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateBeefDto {
    @IsUUID()
    target_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(50)
    tldr!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    chat_passage!: string;
}
