import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendContactRequestDto {
    @IsUUID()
    receiver_id!: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    message_preview?: string;
}
