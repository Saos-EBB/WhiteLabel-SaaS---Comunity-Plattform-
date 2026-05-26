import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../data-source';

interface CityRow {
    name: string;
    country: string;
    region: string | null;
    population: number | null;
    lat: number;
    lng: number;
    is_capital: boolean;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function parseCsv(filePath: string): CityRow[] {
    const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Skip header row
    return lines.slice(1).map(line => {
        const [stadtName, land, region, einwohnerzahl, breitengrad, laengengrad, istHauptstadt] =
            line.split(',');

        const populationRaw = einwohnerzahl?.trim();
        const regionRaw = region?.trim();

        return {
            name:       stadtName.trim(),
            country:    land.trim(),
            region:     regionRaw && regionRaw.length > 0 ? regionRaw : null,
            population: populationRaw && populationRaw.length > 0 ? parseInt(populationRaw, 10) : null,
            lat:        parseFloat(breitengrad.trim()),
            lng:        parseFloat(laengengrad.trim()),
            is_capital: istHauptstadt?.trim() === 'True',
        };
    });
}

async function main(): Promise<void> {
    await AppDataSource.initialize();

    const csvPath = path.join(__dirname, 'autofill_inkl_ottensheim_style.csv');
    const rows = parseCsv(csvPath);
    console.log(`Parsed ${rows.length} rows from CSV`);

    const qr = AppDataSource.createQueryRunner();
    await qr.connect();

    let inserted = 0;

    try {
        for (const batch of chunk(rows, 500)) {
            const params: (string | number | boolean | null)[] = [];
            const placeholders = batch.map((row, i) => {
                const base = i * 7;
                params.push(
                    row.name,
                    row.country,
                    row.region,
                    row.population,
                    row.lat,
                    row.lng,
                    row.is_capital,
                );
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
            }).join(', ');

            const result = await qr.query(
                `INSERT INTO cities (name, country, region, population, lat, lng, is_capital)
                 VALUES ${placeholders}
                 ON CONFLICT DO NOTHING`,
                params,
            );

            inserted += result?.rowCount ?? 0;
        }
    } finally {
        await qr.release();
        await AppDataSource.destroy();
    }

    console.log(`Done — inserted ${inserted} of ${rows.length} rows (${rows.length - inserted} skipped)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
