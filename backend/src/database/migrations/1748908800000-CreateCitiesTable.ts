import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCitiesTable1748908800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS cities (
              id        SERIAL PRIMARY KEY,
              name      VARCHAR(200) NOT NULL,
              country   VARCHAR(100) NOT NULL,
              region    VARCHAR(100) NULL,
              population INTEGER NULL,
              lat       DECIMAL(9,6) NOT NULL,
              lng       DECIMAL(9,6) NOT NULL,
              is_capital BOOLEAN NOT NULL DEFAULT false
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_cities_name ON cities USING gin(to_tsvector('simple', name))
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_cities_country`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_cities_name`);
        await queryRunner.query(`DROP TABLE IF EXISTS cities`);
    }
}
