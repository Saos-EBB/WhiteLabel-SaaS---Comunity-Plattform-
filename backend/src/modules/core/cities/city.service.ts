import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../profile/entities/city.entity';

@Injectable()
export class CityService {
    constructor(
        @InjectRepository(City)
        private readonly cityRepo: Repository<City>,
    ) {}

    async search(q: string, country?: string): Promise<Pick<City, 'id' | 'name' | 'country' | 'region' | 'lat' | 'lng'>[]> {
        const qb = this.cityRepo
            .createQueryBuilder('c')
            .select(['c.id', 'c.name', 'c.country', 'c.region', 'c.lat', 'c.lng'])
            .where('c.name ILIKE :q', { q: `%${q}%` })
            .orderBy('c.population', 'DESC', 'NULLS LAST')
            .limit(10);

        if (country) {
            qb.andWhere('c.country = :country', { country });
        }

        return qb.getMany();
    }
}
