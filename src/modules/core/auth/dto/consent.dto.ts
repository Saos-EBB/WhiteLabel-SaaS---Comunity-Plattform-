import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsUUID, ArrayMinSize, ValidateNested } from 'class-validator';

export class ConsentItemDto {
    @IsUUID()
    agb_version_id!: string;

    @IsBoolean()
    accepted!: boolean;
}

export class ConsentDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ConsentItemDto)
    consents!: ConsentItemDto[];
}
