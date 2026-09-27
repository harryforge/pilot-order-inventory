import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { ENTITIES } from '../database/entities.js';
import { MIGRATIONS } from '../database/migrations.js';

/**
 * Builds the PostgreSQL connection options from environment variables.
 * The defaults match docker-compose.yml and .env.example (fake, local-only values).
 * The schema is changed only by migrations: `synchronize` stays off.
 * Entities and migrations are listed as classes (not file globs), so the same options work
 * for the compiled app, the TypeORM CLI and the tests that run the TypeScript sources.
 */
export function databaseOptions(env: NodeJS.ProcessEnv = process.env): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST ?? 'localhost',
    port: Number(env.POSTGRES_PORT ?? 5432),
    database: env.POSTGRES_DB ?? 'pilot',
    username: env.POSTGRES_USER ?? 'pilot',
    password: env.POSTGRES_PASSWORD ?? 'pilot-local-only',
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: false,
  };
}
