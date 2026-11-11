import { buildApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db/client.js';

const { db, pool } = createDb(config.databaseUrl);
const app = buildApp({ db, logger: { level: config.logLevel } });

app.addHook('onClose', async () => {
  await pool.end();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: config.port, host: config.host });
