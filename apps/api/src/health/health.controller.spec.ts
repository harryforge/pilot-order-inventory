import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from './health.controller.js';
import { HealthService, type HealthStatus } from './health.service.js';

describe('GET /api/health', () => {
  let app: INestApplication;
  const check = jest.fn<() => Promise<HealthStatus>>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check } }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 when the database is up', async () => {
    check.mockResolvedValueOnce({ status: 'ok', database: 'up' });

    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is down', async () => {
    check.mockResolvedValueOnce({ status: 'degraded', database: 'down' });

    const response = await request(app.getHttpServer()).get('/api/health').expect(503);

    expect(response.body).toEqual({ status: 'degraded', database: 'down' });
  });
});
