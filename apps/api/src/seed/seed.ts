import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { generateSeedData } from './seed-data.js';
import { runSeed, SeedRefusedError } from './seeder.js';

/** `pnpm db:seed [--reset]`: loads the fictional sample data (F6). */
async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const summary = await runSeed(app, generateSeedData(), { reset });
    console.log(
      `Seeded ${summary.products} products, ${summary.customers} customers and ` +
        `${summary.orders} orders (${summary.shipped} shipped).`,
    );
  } catch (error) {
    if (error instanceof SeedRefusedError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await app.close();
  }
}

await main();
