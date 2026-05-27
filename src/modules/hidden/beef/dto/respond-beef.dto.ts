import { IsString, IsIn } from 'class-validator';

export class RespondBeefDto {
    @IsString()
    @IsIn(['fight', 'chicken'])
    response!: 'fight' | 'chicken';
}
