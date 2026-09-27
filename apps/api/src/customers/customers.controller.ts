import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateCustomerDto } from './customer.dto.js';
import type { Customer } from './customer.entity.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(): Promise<Customer[]> {
    return this.customersService.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<Customer> {
    return this.customersService.get(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(dto);
  }
}
