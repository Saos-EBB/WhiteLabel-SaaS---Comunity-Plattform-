import { IsString, IsIn, IsNumber, Min } from 'class-validator';

export class VoteBeefDto {
    @IsString()
    @IsIn(['initiator', 'target'])
    side!: 'initiator' | 'target';

    @IsNumber()
    @Min(1)
    coins_wagered!: number;
}
