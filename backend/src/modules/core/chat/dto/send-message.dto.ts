import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    content?: string;

    @IsOptional()
    @IsEnum(MessageType)
    type?: MessageType;
}
