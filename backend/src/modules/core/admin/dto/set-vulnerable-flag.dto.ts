import { IsBoolean } from 'class-validator';

export class SetVulnerableFlagDto {
    @IsBoolean()
    vulnerable_flag!: boolean;
}
