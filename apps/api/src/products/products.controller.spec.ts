import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { productNotFound } from '../common/domain-error.js';
import { createControllerApp } from '../testing/controller-app.js';
import type { Product } from './product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn<ProductsService['list']>(),
    get: jest.fn<ProductsService['get']>(),
    create: jest.fn<ProductsService['create']>(),
    update: jest.fn<ProductsService['update']>(),
  };
  const product = {
    id: 1,
    sku: 'TEA-001',
    name: 'Green tea 100 g',
    price: 980,
    salesStatus: 'on_sale',
  } as Product;
  const valid = {
    sku: 'TEA-001',
    name: 'Green tea 100 g',
    price: 980,
    salesStatus: 'on_sale' as const,
  };

  beforeAll(async () => {
    app = await createControllerApp(ProductsController, [
      { provide: ProductsService, useValue: service },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET /api/products lists the products', async () => {
    service.list.mockResolvedValue([product]);

    const response = await request(app.getHttpServer()).get('/api/products').expect(200);

    expect(response.body).toEqual([product]);
  });

  it('GET /api/products/:id returns 404 with a code for an unknown product', async () => {
    service.get.mockRejectedValue(productNotFound(99));

    const response = await request(app.getHttpServer()).get('/api/products/99').expect(404);

    expect(response.body).toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    expect(service.get).toHaveBeenCalledWith(99);
  });

  it('GET /api/products/:id rejects an id that is not a number', async () => {
    await request(app.getHttpServer()).get('/api/products/abc').expect(400);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('POST /api/products creates a product and trims the text fields', async () => {
    service.create.mockResolvedValue(product);

    await request(app.getHttpServer())
      .post('/api/products')
      .send({ ...valid, sku: '  TEA-001 ', name: ' Green tea 100 g ' })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith(valid);
  });

  it.each([
    ['a missing SKU', { ...valid, sku: undefined }],
    ['a blank name', { ...valid, name: '   ' }],
    ['a negative price', { ...valid, price: -1 }],
    ['a price with decimals', { ...valid, price: 10.5 }],
    ['an unknown sales status', { ...valid, salesStatus: 'sold_out' }],
    ['an unknown field', { ...valid, tax: 10 }],
  ])('POST /api/products rejects %s with 400', async (_case, body) => {
    await request(app.getHttpServer()).post('/api/products').send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('PATCH /api/products/:id updates only the given fields', async () => {
    service.update.mockResolvedValue({ ...product, price: 1200 });

    const response = await request(app.getHttpServer())
      .patch('/api/products/1')
      .send({ price: 1200 })
      .expect(200);

    expect(service.update).toHaveBeenCalledWith(1, { price: 1200 });
    expect(response.body).toMatchObject({ price: 1200 });
  });

  it('PATCH /api/products/:id rejects invalid values', async () => {
    await request(app.getHttpServer()).patch('/api/products/1').send({ sku: '' }).expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
