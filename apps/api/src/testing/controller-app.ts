import type { INestApplication, Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureApp } from '../common/configure-app.js';

/**
 * Starts one controller with fake services, with the same prefix and validation as the real app.
 * Controller tests use it to check routing, request validation and error responses without a database.
 */
export async function createControllerApp(
  controller: Type<unknown>,
  providers: Provider[],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [controller],
    providers,
  }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}
