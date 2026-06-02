import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CityService } from './city.service';

@Controller('cities')
export class CityController {
    constructor(private readonly cityService: CityService) {}

    @Get('search')
    search(
        @Query('q') q?: string,
        @Query('country') country?: string,
    ) {
        if (!q || q.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }
        return this.cityService.search(q.trim(), country);
    }
}
