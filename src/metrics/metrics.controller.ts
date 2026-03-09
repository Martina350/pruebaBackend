import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getGeneralMetrics() {
    return this.metricsService.getGeneralMetrics();
  }

  @Get('days')
  async getDayMetrics() {
    return this.metricsService.getDayMetrics();
  }

  @Get('slots')
  async getSlotMetrics() {
    return this.metricsService.getSlotMetrics();
  }
}
