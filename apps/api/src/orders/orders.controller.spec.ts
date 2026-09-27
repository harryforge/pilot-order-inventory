import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DomainError, ERROR_CODES } from '../common/domain-error.js';
import { createControllerApp } from '../testing/controller-app.js';
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from './order.dto.js';
import type { Order } from './order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

describe('OrdersController', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn<OrdersService['list']>(),
    get: jest.fn<OrdersService['get']>(),
    create: jest.fn<OrdersService['create']>(),
    ship: jest.fn<OrdersService['ship']>(),
  };
  const order = { id: 1, orderNumber: 'SO-000001', status: '受付' } as Order;
  const valid = { customerId: 1, lines: [{ productId: 2, quantity: 3 }] };

  beforeAll(async () => {
    app = await createControllerApp(OrdersController, [
      { provide: OrdersService, useValue: service },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET /api/orders passes the trimmed search filters', async () => {
    service.list.mockResolvedValue([order]);

    await request(app.getHttpServer())
      .get('/api/orders')
      .query({ orderNumber: ' SO-0 ', customer: 'Kasou' })
      .expect(200);

    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber: 'SO-0', customer: 'Kasou' }),
    );
  });

  it('GET /api/orders refuses unknown query parameters', async () => {
    await request(app.getHttpServer()).get('/api/orders?page=2').expect(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('POST /api/orders creates an order', async () => {
    service.create.mockResolvedValue(order);

    const response = await request(app.getHttpServer()).post('/api/orders').send(valid).expect(201);

    expect(response.body).toMatchObject({ orderNumber: 'SO-000001', status: '受付' });
    expect(service.create).toHaveBeenCalledWith(valid);
  });

  it('POST /api/orders returns the shortages with 409', async () => {
    const details = [{ productId: 2, requested: 3, available: 1 }];
    service.create.mockRejectedValue(
      new DomainError(HttpStatus.CONFLICT, ERROR_CODES.insufficientStock, 'Not enough stock', details),
    );

    const response = await request(app.getHttpServer()).post('/api/orders').send(valid).expect(409);

    expect(response.body).toMatchObject({ code: 'INSUFFICIENT_STOCK', details });
  });

  it.each([
    ['no lines', { customerId: 1, lines: [] }],
    ['lines that are not a list', { customerId: 1, lines: 'x' }],
    ['a missing customer', { lines: valid.lines }],
    ['a zero quantity', { customerId: 1, lines: [{ productId: 2, quantity: 0 }] }],
    [
      'a quantity above the limit',
      { customerId: 1, lines: [{ productId: 2, quantity: MAX_LINE_QUANTITY + 1 }] },
    ],
    ['a line without product', { customerId: 1, lines: [{ quantity: 1 }] }],
    [
      'too many lines',
      {
        customerId: 1,
        lines: Array.from({ length: MAX_ORDER_LINES + 1 }, (_, i) => ({ productId: i + 1, quantity: 1 })),
      },
    ],
    ['an unknown field on a line', { customerId: 1, lines: [{ productId: 2, quantity: 1, price: 1 }] }],
    ['a status set by the client', { ...valid, status: '出荷済' }],
  ])('POST /api/orders rejects %s with 400', async (_case, body) => {
    await request(app.getHttpServer()).post('/api/orders').send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST /api/orders/:id/ship ships the order', async () => {
    service.ship.mockResolvedValue({ ...order, status: '出荷済' });

    const response = await request(app.getHttpServer()).post('/api/orders/1/ship').expect(201);

    expect(service.ship).toHaveBeenCalledWith(1);
    expect(response.body.status).toBe('出荷済');
  });
});
