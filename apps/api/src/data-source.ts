import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './config/database.config.js';

// Used by the TypeORM CLI (`pnpm migration:run`). The app itself connects through AppModule.
export default new DataSource(databaseOptions());
