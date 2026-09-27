import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async get(): Promise<HealthStatus> {
    const health = await this.healthService.check();
    if (health.database === 'down') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
