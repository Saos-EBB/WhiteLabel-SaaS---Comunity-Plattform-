/**
 * Gemeinsame Hilfsfunktionen fuer die SEED_*-gesteuerten Zusatz-Seeds
 * (Fake-User, Coin/Cash-Transaktionen, Media). Fester Random-Seed, damit
 * zwei Laeufe auf einem frischen Volume identische Daten erzeugen.
 */

const SEED = 20260724;

/**
 * Leitet aus einem stabilen Schluessel (z.B. Nickname + Namespace) einen
 * numerischen Seed ab (FNV-1a). Macht die Random-Werte pro Entity
 * unabhaengig von Lauf-/Batch-Reihenfolge — top-up (SEED_USERS erhoehen,
 * neue User dazwischen einsortiert) kollidiert sonst mit bereits
 * vergebenen Werten aus frueheren Laeufen.
 */
export function seedFromString(key: string): number {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function createRng(seed: number = SEED): () => number {
    let state = seed >>> 0;
    return function rng(): number {
        state |= 0;
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randomInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

export function randomChoice<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

export function weightedChoice<T>(rng: () => number, entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rng() * total;
    for (const [value, weight] of entries) {
        if (roll < weight) return value;
        roll -= weight;
    }
    return entries[entries.length - 1][0];
}

/**
 * Splits an array into fixed-size batches (last batch may be smaller).
 * Used to keep buildBulkInsert() batches under Postgres's 65535-bound-
 * parameter-per-statement limit for large SEED_*-driven inserts.
 */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

/**
 * Baut "($1,$2,<suffix>),($3,$4,<suffix>)"-Platzhalter + flache Parameterliste
 * fuer Bulk-Inserts. `staticSuffix` haengt pro Zeile feste SQL-Ausdruecke an
 * (z.B. "NOW(), NOW()"), die nicht ueber Parameter laufen muessen.
 */
export function buildBulkInsert(
    rows: readonly unknown[][],
    staticSuffix?: string,
): { placeholders: string; params: unknown[] } {
    const params: unknown[] = [];
    const placeholders = rows
        .map(row => {
            const ph = row.map(v => { params.push(v); return `$${params.length}`; }).join(',');
            return staticSuffix ? `(${ph},${staticSuffix})` : `(${ph})`;
        })
        .join(',\n            ');
    return { placeholders, params };
}
