import { IsOptional, Matches } from 'class-validator';

const POSITIVE_DECIMAL = /^\d+(\.\d+)?$/;
const msg = { message: 'must be a positive number' };

export class UpdatePricesDto {
    @IsOptional()
    @Matches(POSITIVE_DECIMAL, msg)
    monthly?: string;

    @IsOptional()
    @Matches(POSITIVE_DECIMAL, msg)
    yearly?: string;

    @IsOptional()
    @Matches(POSITIVE_DECIMAL, msg)
    lifetime?: string;
}
