import type { DataSource } from 'typeorm';

/**
 * Empties every entity table and restarts the ids and the order number sequence.
 * The migration history is kept. Used by the seed `--reset` option and by the tests.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas.map((meta) => `"${meta.tableName}"`).join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
