import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { StockMovementDto } from './inventory.dto.js';
import { InventoryService, type StockLevel } from './inventory.service.js';
import type { StockMovement } from './stock-movement.entity.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list(): Promise<StockLevel[]> {
    return this.inventoryService.listStock();
  }

  @Get(':productId')
  get(@Param('productId', ParseIntPipe) productId: number): Promise<StockLevel> {
    return this.inventoryService.getStock(productId);
  }

  @Get(':productId/movements')
  movements(@Param('productId', ParseIntPipe) productId: number): Promise<StockMovement[]> {
    return this.inventoryService.listMovements(productId);
  }

  @Post('goods-in')
  goodsIn(@Body() dto: StockMovementDto): Promise<StockMovement> {
    return this.inventoryService.goodsIn(dto);
  }

  @Post('goods-out')
  goodsOut(@Body() dto: StockMovementDto): Promise<StockMovement> {
    return this.inventoryService.goodsOut(dto);
  }
}
