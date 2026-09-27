import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './config/database.config.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() }),
    HealthModule,
  ],
})
export class AppModule {}
