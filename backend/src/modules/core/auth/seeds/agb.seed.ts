import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnApplicationBootstrap } from '@nestjs/common';
import { AgbVersion, AgbType } from '../../profile/entities/agb-version.entity';

@Injectable()
export class AgbSeedService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(AgbVersion)
        private readonly agbVersionRepo: Repository<AgbVersion>,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const agb = await this.agbVersionRepo.findOne({
            where: { version: '1.0', type: AgbType.AGB },
        });
        if (!agb) {
            await this.agbVersionRepo.save({
                version: '1.0',
                type: AgbType.AGB,
                is_current: true,
                content_normal: '[PLATZHALTER] Allgemeine Geschäftsbedingungen v1.0',
                content_simple: '[PLATZHALTER] AGB in einfacher Sprache',
                content_url: null,
                valid_from: new Date(),
                valid_until: null,
            });
        }

        const privacy = await this.agbVersionRepo.findOne({
            where: { version: '1.0', type: AgbType.PRIVACY },
        });
        if (!privacy) {
            await this.agbVersionRepo.save({
                version: '1.0',
                type: AgbType.PRIVACY,
                is_current: true,
                content_normal: '[PLATZHALTER] Datenschutzerklärung v1.0',
                content_simple: '[PLATZHALTER] Datenschutz in einfacher Sprache',
                content_url: null,
                valid_from: new Date(),
                valid_until: null,
            });
        }
    }
}
