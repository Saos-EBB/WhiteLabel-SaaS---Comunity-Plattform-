import { IsNotEmpty, IsString } from 'class-validator';

export class RejectMediaDto {
    @IsString()
    @IsNotEmpty()
    reason!: string;
}
