import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { FEATURE_MODULES } from '../app.module.js';
import { configureApp } from '../common/configure-app.js';
import { databaseOptions } from '../config/database.config.js';

/**
 * Helpers for the integration tests (`*.int-spec.ts`). They run against a separate database
 * (default `<POSTGRES_DB>_test`) on the Docker Compose PostgreSQL. The schema is dropped and
 * rebuilt from the migrations once per test file, so the migrations are tested as well.
 */
export function testDatabaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): PostgresDataSourceOptions {
  const database = env.POSTGRES_TEST_DB ?? `${env.POSTGRES_DB ?? 'pilot'}_test`;
  if (!database.endsWith('_test')) {
    // The schema is dropped: refuse anything that does not look like a test database.
    throw new Error(`Refusing to use "${database}" for tests: the name must end with "_test"`);
  }
  return { ...databaseOptions(env), database, dropSchema: true, migrationsRun: true };
}

async function ensureDatabaseExists(options: PostgresDataSourceOptions): Promise<void> {
  // Connect to the default `postgres` database to create the test database if it is missing.
  const admin = new DataSource({ ...options, database: 'postgres', entities: [], migrations: [] });
  await admin.initialize();
  try {
    const found: unknown[] = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      options.database,
    ]);
    if (found.length === 0) {
      // The name was checked by testDatabaseOptions and comes from local configuration.
      await admin.query(`CREATE DATABASE "${String(options.database)}"`);
    }
  } finally {
    await admin.destroy();
  }
}

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
}

/**
 * Starts the api with every feature module on a freshly migrated test database.
 * `customize` can replace providers, for example to inject a failure.
 */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<TestApp> {
  const options = testDatabaseOptions();
  await ensureDatabaseExists(options);
  const moduleRef = await customize(
    Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(options), ...FEATURE_MODULES],
    }),
  ).compile();
  const app = configureApp(moduleRef.createNestApplication());
  // Listen on a free port once. Otherwise supertest starts and stops the server around every
  // batch of requests, which makes the parallel-request tests timing-dependent.
  await app.listen(0, '127.0.0.1');
  return { app, dataSource: app.get(DataSource) };
}

export { truncateAll } from '../database/truncate.js';
