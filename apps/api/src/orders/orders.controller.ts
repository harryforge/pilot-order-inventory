import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateOrderDto, ListOrdersQuery } from './order.dto.js';
import type { Order } from './order.entity.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQuery): Promise<Order[]> {
    return this.ordersService.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return this.ordersService.get(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(dto);
  }

  @Post(':id/ship')
  ship(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return this.ordersService.ship(id);
  }
}
