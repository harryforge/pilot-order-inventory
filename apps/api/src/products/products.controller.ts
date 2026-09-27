import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import type { Product } from './product.entity.js';
import { CreateProductDto, UpdateProductDto } from './product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(): Promise<Product[]> {
    return this.productsService.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.get(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto): Promise<Product> {
    return this.productsService.update(id, dto);
  }
}
