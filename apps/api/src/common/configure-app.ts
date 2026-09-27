import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Settings shared by the running app and the controller tests, so tests see the same
 * route prefix and request validation as production.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  return app;
}
