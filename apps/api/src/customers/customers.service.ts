import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { customerNotFound } from '../common/domain-error.js';
import { Customer } from './customer.entity.js';
import type { CreateCustomerDto } from './customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly dataSource: DataSource) {}

  list(): Promise<Customer[]> {
    return this.dataSource.getRepository(Customer).find({ order: { id: 'ASC' } });
  }

  async get(id: number): Promise<Customer> {
    const customer = await this.dataSource.getRepository(Customer).findOneBy({ id });
    if (!customer) {
      throw customerNotFound(id);
    }
    return customer;
  }

  create(dto: CreateCustomerDto): Promise<Customer> {
    const repository = this.dataSource.getRepository(Customer);
    return repository.save(repository.create({ ...dto }));
  }
}
