import { describe, expect, it } from '@jest/globals';
import { testDatabaseOptions } from '../testing/test-app.js';
import { databaseOptions } from './database.config.js';

describe('databaseOptions', () => {
  it('uses the local defaults and never synchronizes the schema', () => {
    const options = databaseOptions({});

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'pilot',
      synchronize: false,
    });
    expect(options.migrations).not.toHaveLength(0);
  });

  it('reads the connection from the environment', () => {
    expect(
      databaseOptions({ POSTGRES_HOST: 'db', POSTGRES_PORT: '55432', POSTGRES_DB: 'other' }),
    ).toMatchObject({ host: 'db', port: 55432, database: 'other' });
  });
});

describe('testDatabaseOptions', () => {
  it('uses a separate _test database that is rebuilt from the migrations', () => {
    expect(testDatabaseOptions({ POSTGRES_DB: 'pilot' })).toMatchObject({
      database: 'pilot_test',
      dropSchema: true,
      migrationsRun: true,
    });
  });

  it('refuses a database name that does not end with _test', () => {
    expect(() => testDatabaseOptions({ POSTGRES_TEST_DB: 'pilot' })).toThrow('_test');
  });
});
