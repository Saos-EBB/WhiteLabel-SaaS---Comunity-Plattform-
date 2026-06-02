import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsService {
    private readonly cache = new Map<string, { value: string; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 60_000;

    constructor(
        @InjectRepository(SystemSetting)
        private readonly repo: Repository<SystemSetting>,
    ) {}

    async getNumber(key: string, fallback: number): Promise<number> {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            const n = parseInt(cached.value, 10);
            return isNaN(n) ? fallback : n;
        }

        const setting = await this.repo.findOne({ where: { key } });
        if (!setting) return fallback;

        this.cache.set(key, { value: setting.value, expiresAt: Date.now() + this.CACHE_TTL_MS });
        const n = parseInt(setting.value, 10);
        return isNaN(n) ? fallback : n;
    }

    async getString(key: string, fallback: string): Promise<string> {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiresAt) return cached.value;

        const setting = await this.repo.findOne({ where: { key } });
        if (!setting) return fallback;

        this.cache.set(key, { value: setting.value, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return setting.value;
    }

    async getAll(): Promise<SystemSetting[]> {
        return this.repo.find({ order: { key: 'ASC' } });
    }

    async set(key: string, value: string, adminId: string): Promise<SystemSetting> {
        let setting = await this.repo.findOne({ where: { key } });
        if (setting) {
            setting.value      = value;
            setting.updated_by = adminId;
            setting.updated_at = new Date();
        } else {
            setting = this.repo.create({ key, value, updated_by: adminId, updated_at: new Date() });
        }
        const saved = await this.repo.save(setting);
        this.cache.delete(key);
        return saved;
    }
}
