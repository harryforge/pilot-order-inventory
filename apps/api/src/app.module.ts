import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './config/database.config.js';
import { CustomersModule } from './customers/customers.module.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProductsModule } from './products/products.module.js';

/** Feature modules. Tests import this list with a test database. */
export const FEATURE_MODULES = [ProductsModule, InventoryModule, CustomersModule, OrdersModule];

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() }),
    HealthModule,
    ...FEATURE_MODULES,
  ],
})
export class AppModule {}
