import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export')
  async exportReport(
    @Res() res: Response,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
    @Query('dayId') dayId?: string,
    @Query('slotId') slotId?: string,
    @Query('status') status?: string,
    @Query('amie') amie?: string,
  ) {
    const filters = {
      dayId,
      slotId,
      status,
      amie,
    };

    if (format === 'csv') {
      const csv = await this.reportsService.generateCSVReport(filters);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reservas-${new Date().toISOString().split('T')[0]}.csv"`,
      );
      res.send(csv);
    } else {
      const buffer = await this.reportsService.generateExcelReport(filters);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reservas-${new Date().toISOString().split('T')[0]}.xlsx"`,
      );
      res.send(buffer);
    }
  }
}
