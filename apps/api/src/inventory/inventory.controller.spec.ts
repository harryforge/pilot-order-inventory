import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DomainError, ERROR_CODES } from '../common/domain-error.js';
import { createControllerApp } from '../testing/controller-app.js';
import { InventoryController } from './inventory.controller.js';
import { MAX_MOVEMENT_QUANTITY } from './inventory.dto.js';
import { InventoryService } from './inventory.service.js';
import type { StockMovement } from './stock-movement.entity.js';

describe('InventoryController', () => {
  let app: INestApplication;
  const service = {
    listStock: jest.fn<InventoryService['listStock']>(),
    getStock: jest.fn<InventoryService['getStock']>(),
    listMovements: jest.fn<InventoryService['listMovements']>(),
    goodsIn: jest.fn<InventoryService['goodsIn']>(),
    goodsOut: jest.fn<InventoryService['goodsOut']>(),
  };
  const movement = { id: 1, productId: 3, type: 'in', quantity: 5 } as StockMovement;

  beforeAll(async () => {
    app = await createControllerApp(InventoryController, [
      { provide: InventoryService, useValue: service },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET /api/inventory lists the stock', async () => {
    service.listStock.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/inventory').expect(200, []);
  });

  it('GET /api/inventory/:productId/movements returns the history of one product', async () => {
    service.listMovements.mockResolvedValue([movement]);

    await request(app.getHttpServer()).get('/api/inventory/3/movements').expect(200);

    expect(service.listMovements).toHaveBeenCalledWith(3);
  });

  it('POST /api/inventory/goods-in records goods in', async () => {
    service.goodsIn.mockResolvedValue(movement);

    await request(app.getHttpServer())
      .post('/api/inventory/goods-in')
      .send({ productId: 3, quantity: 5, note: ' delivery ' })
      .expect(201);

    expect(service.goodsIn).toHaveBeenCalledWith({ productId: 3, quantity: 5, note: 'delivery' });
  });

  it('POST /api/inventory/goods-out returns 409 with the shortage when stock is too low', async () => {
    const details = [{ productId: 3, requested: 9, available: 2 }];
    service.goodsOut.mockRejectedValue(
      new DomainError(HttpStatus.CONFLICT, ERROR_CODES.insufficientStock, 'Not enough stock', details),
    );

    const response = await request(app.getHttpServer())
      .post('/api/inventory/goods-out')
      .send({ productId: 3, quantity: 9 })
      .expect(409);

    expect(response.body).toMatchObject({ code: 'INSUFFICIENT_STOCK', details });
  });

  it.each([
    ['a zero quantity', { productId: 3, quantity: 0 }],
    ['a quantity above the limit', { productId: 3, quantity: MAX_MOVEMENT_QUANTITY + 1 }],
    ['a quantity with decimals', { productId: 3, quantity: 1.5 }],
    ['a missing product', { quantity: 1 }],
  ])('rejects %s with 400', async (_case, body) => {
    await request(app.getHttpServer()).post('/api/inventory/goods-in').send(body).expect(400);
    await request(app.getHttpServer()).post('/api/inventory/goods-out').send(body).expect(400);
    expect(service.goodsIn).not.toHaveBeenCalled();
    expect(service.goodsOut).not.toHaveBeenCalled();
  });
});
