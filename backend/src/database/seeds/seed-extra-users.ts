/**
 * Fake-User-Seed
 * Ausfuehren: SEED_USERS=50 npx ts-node -r tsconfig-paths/register src/database/seeds/seed-extra-users.ts
 *
 * Legt SEED_USERS zusaetzliche, zufaellig generierte User + Profile an
 * (on top der 45 kuratierten demo-users.yaml-User), als Datenvolumen fuer
 * die Coin/Cash/Media-Seeds. Nickname-Praefix "seed_user_" identifiziert
 * sie eindeutig.
 *
 * Idempotent: fehlt SEED_USERS gegenueber der bereits vorhandenen Anzahl,
 * werden nur die fehlenden ergaenzt. SEED_RESET=true loescht alle
 * seed_user_* User (inkl. abhaengiger payment_logs/subscriptions, der Rest
 * kaskadiert per FK) und baut sie neu auf.
 */

import 'dotenv/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { encryptField, hashEmail } from '../../common/crypto/crypto.helper';
import { createRng, randomInt, seedFromString, buildBulkInsert } from './seed-shared';

const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME     ?? '',
    username: process.env.DB_USER     ?? '',
    password: process.env.DB_PASSWORD ?? '',
    synchronize: false,
    logging: false,
    extra: { options: '-c client_encoding=UTF8' },
});

const SEED_USERS = parseInt(process.env.SEED_USERS ?? '0', 10);
const SEED_RESET = (process.env.SEED_RESET ?? 'false').toLowerCase() === 'true';

const NICK_PREFIX = 'seed_user_';
const PUBLIC_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function pad(n: number): string {
    return String(n).padStart(4, '0');
}

async function main() {
    if (SEED_USERS <= 0) {
        console.log('seed-extra-users: SEED_USERS=0 — nichts zu tun');
        return;
    }

    await ds.initialize();
    console.log('seed-extra-users: verbunden mit DB', process.env.DB_NAME);

    if (SEED_RESET) {
        await ds.query(
            `DELETE FROM payment_logs WHERE user_id IN (
                SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id WHERE p.nickname LIKE $1
             )`,
            [`${NICK_PREFIX}%`],
        );
        await ds.query(
            `DELETE FROM subscriptions WHERE user_id IN (
                SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id WHERE p.nickname LIKE $1
             )`,
            [`${NICK_PREFIX}%`],
        );
        // DELETE ... RETURNING liefert bei TypeORM ein Tupel [rows, rowCount] zurueck
        // (anders als INSERT ... RETURNING, das die Rows direkt liefert) — daher hier
        // destrukturieren statt .length auf dem Query-Ergebnis selbst zu lesen.
        const [deletedRows] = await ds.query(
            `DELETE FROM users WHERE id IN (
                SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id WHERE p.nickname LIKE $1
             ) RETURNING id`,
            [`${NICK_PREFIX}%`],
        );
        console.log(`  RESET  ${deletedRows.length} seed_user_* geloescht (Coin/Media/Profile kaskadierten mit)`);
    }

    const existing = await ds.query(
        `SELECT COUNT(*)::int AS n FROM profiles WHERE nickname LIKE $1`,
        [`${NICK_PREFIX}%`],
    );
    const existingCount: number = existing[0].n;

    if (existingCount >= SEED_USERS) {
        console.log(`seed-extra-users: SKIP  ${existingCount} seed_user_* bereits vorhanden (Ziel ${SEED_USERS})`);
        await ds.destroy();
        return;
    }

    const passwordHash = await bcrypt.hash('SeedUser1234!', 12);

    const userRows: unknown[][] = [];
    const profileRows: unknown[][] = [];

    for (let i = existingCount + 1; i <= SEED_USERS; i++) {
        const nickname = `${NICK_PREFIX}${pad(i)}`;
        const rng = createRng(seedFromString(`${nickname}:extra-user`));
        const email = `${nickname}@seed.local`;
        const userId = crypto.randomUUID();

        let publicId = '';
        for (let c = 0; c < 6; c++) publicId += PUBLIC_ID_CHARS[Math.floor(rng() * PUBLIC_ID_CHARS.length)];

        const ageYears = randomInt(rng, 18, 65);
        const birthdate = new Date();
        birthdate.setFullYear(birthdate.getFullYear() - ageYears);
        birthdate.setMonth(randomInt(rng, 0, 11), randomInt(rng, 1, 28));

        userRows.push([
            userId, encryptField(email), hashEmail(email), passwordHash,
            'user', true, publicId,
        ]);
        profileRows.push([
            crypto.randomUUID(), userId, nickname, birthdate.toISOString().slice(0, 10), true, true,
        ]);
    }

    const users = buildBulkInsert(userRows, 'NOW(), NOW(), NOW()');
    await ds.query(
        `INSERT INTO users
            (id, email, email_search_hash, password_hash, role, is_verified, public_id,
             email_verified_at, created_at, last_login)
         VALUES
            ${users.placeholders}`,
        users.params,
    );

    const profiles = buildBulkInsert(profileRows, 'NOW()');
    await ds.query(
        `INSERT INTO profiles
            (id, user_id, nickname, birthdate, is_published, onboarding_completed, updated_at)
         VALUES
            ${profiles.placeholders}`,
        profiles.params,
    );

    await ds.destroy();
    console.log(`seed-extra-users: ${profileRows.length} seed_user_* angelegt (${existingCount} bereits vorhanden).`);
}

main().catch(err => {
    console.error('seed-extra-users: Fehler:', err.message);
    process.exit(1);
});
