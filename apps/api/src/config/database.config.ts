import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

/**
 * Builds the PostgreSQL connection options from environment variables.
 * The defaults match docker-compose.yml and .env.example (fake, local-only values).
 * The schema is changed only by migrations: `synchronize` stays off.
 */
export function databaseOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST ?? 'localhost',
    port: Number(env.POSTGRES_PORT ?? 5432),
    database: env.POSTGRES_DB ?? 'pilot',
    username: env.POSTGRES_USER ?? 'pilot',
    password: env.POSTGRES_PASSWORD ?? 'pilot-local-only',
    entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
    migrations: [join(import.meta.dirname, '..', 'migrations', '*.js')],
    synchronize: false,
  };
}
