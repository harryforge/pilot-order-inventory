import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  type Query = (sql: string) => Promise<unknown>;

  async function createService(query: Query): Promise<HealthService> {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: DataSource, useValue: { query } }],
    }).compile();
    return moduleRef.get(HealthService);
  }

  it('reports the database as up when a query succeeds', async () => {
    const query = jest.fn<Query>().mockResolvedValue([{ '?column?': 1 }]);
    const service = await createService(query);

    await expect(service.check()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports the database as down when a query fails', async () => {
    const query = jest.fn<Query>().mockRejectedValue(new Error('connection refused'));
    const service = await createService(query);

    await expect(service.check()).resolves.toEqual({ status: 'degraded', database: 'down' });
  });
});
