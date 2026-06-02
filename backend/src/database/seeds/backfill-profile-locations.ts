import 'dotenv/config';
import { AppDataSource } from '../data-source';

interface ProfileRow {
    user_id: string;
    nickname: string | null;
    city: string;
}

interface CityRow {
    lat: string;
    lng: string;
}

async function main(): Promise<void> {
    await AppDataSource.initialize();

    try {
        const profiles = await AppDataSource.manager.query<ProfileRow[]>(
            `SELECT user_id, nickname, city
             FROM profiles
             WHERE location IS NULL AND city IS NOT NULL AND city <> ''`,
        );

        console.log(`Found ${profiles.length} profiles to backfill`);

        let updated = 0;

        for (const profile of profiles) {
            const cities = await AppDataSource.manager.query<CityRow[]>(
                `SELECT lat, lng FROM cities WHERE name ILIKE $1 LIMIT 1`,
                [profile.city],
            );

            if (cities.length === 0) continue;

            const { lat, lng } = cities[0];

            await AppDataSource.manager.query(
                `UPDATE profiles
                 SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
                 WHERE user_id = $3`,
                [parseFloat(lng), parseFloat(lat), profile.user_id],
            );

            console.log(`Updated: ${profile.city} → ${profile.nickname ?? profile.user_id}`);
            updated++;
        }

        console.log(`Done — ${updated} of ${profiles.length} profiles updated`);
    } finally {
        await AppDataSource.destroy();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
