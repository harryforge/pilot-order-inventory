import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { customerNotFound } from '../common/domain-error.js';
import { createControllerApp } from '../testing/controller-app.js';
import type { Customer } from './customer.entity.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

describe('CustomersController', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn<CustomersService['list']>(),
    get: jest.fn<CustomersService['get']>(),
    create: jest.fn<CustomersService['create']>(),
  };
  const valid = { name: 'Sample Trading Co.', address: '1-2-3 Kasou, Tokyo', phone: '03-0000-0001' };

  beforeAll(async () => {
    app = await createControllerApp(CustomersController, [
      { provide: CustomersService, useValue: service },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('POST /api/customers creates a customer', async () => {
    service.create.mockResolvedValue({ id: 1, ...valid } as Customer);

    await request(app.getHttpServer()).post('/api/customers').send(valid).expect(201);

    expect(service.create).toHaveBeenCalledWith(valid);
  });

  it.each([
    ['a blank name', { ...valid, name: ' ' }],
    ['a missing address', { ...valid, address: undefined }],
    ['a phone with letters', { ...valid, phone: 'call me' }],
    ['a phone that is too short', { ...valid, phone: '123' }],
    ['a phone longer than 20 characters', { ...valid, phone: '+1234567890123456789' + '0' }],
  ])('POST /api/customers rejects %s with 400', async (_case, body) => {
    await request(app.getHttpServer()).post('/api/customers').send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('GET /api/customers/:id returns 404 for an unknown customer', async () => {
    service.get.mockRejectedValue(customerNotFound(5));

    const response = await request(app.getHttpServer()).get('/api/customers/5').expect(404);

    expect(response.body).toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });
  });

  it('GET /api/customers lists the customers', async () => {
    service.list.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/customers').expect(200, []);
  });
});
