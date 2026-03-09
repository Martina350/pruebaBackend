import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Confirmar reserva por token (enlace del correo). Redirige al frontend con ?confirmed=true|error
   */
  @Get('confirm')
  async confirm(
    @Query('token') token: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const { redirectUrl } = await this.reservationsService.confirmByToken(token);
    res.redirect(302, redirectUrl);
  }

  /**
   * Crear una nueva reserva (público)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.create(createReservationDto);
  }

  /**
   * Obtener todas las reservas con filtros (solo admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(
    @Query('dayId') dayId?: string,
    @Query('slotId') slotId?: string,
    @Query('status') status?: string,
    @Query('amie') amie?: string,
  ): Promise<ReservationResponseDto[]> {
    return this.reservationsService.findAll({
      dayId,
      slotId,
      status,
      amie,
    });
  }

  /**
   * Obtener una reserva por ID (solo admin)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<ReservationResponseDto> {
    return this.reservationsService.findOne(id);
  }

  /**
   * Actualizar una reserva (solo admin)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.update(id, updateReservationDto);
  }

  /**
   * Eliminar una reserva (solo admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.reservationsService.remove(id);
  }
}
