import 'dotenv/config';
import { DataSource } from 'typeorm';
const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST ?? 'localhost', port: parseInt(process.env.DB_PORT ?? '5432'), database: process.env.DB_NAME ?? '', username: process.env.DB_USER ?? '', password: process.env.DB_PASSWORD ?? '', synchronize: false, logging: false });
ds.initialize().then(async () => {
    const r = await ds.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position`);
    r.forEach((c: any) => console.log(c.column_name, '-', c.data_type));
    await ds.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
