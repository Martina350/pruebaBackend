import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventsService } from '../events/events.service';
import { Prisma } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';

/** Tiempo de validez del token de confirmación (24 horas) */
const CONFIRMATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private eventsService: EventsService,
    private configService: ConfigService,
  ) {}

  /**
   * Crea una nueva reserva con validaciones y control de concurrencia
   */
  async create(dto: CreateReservationDto): Promise<ReservationResponseDto> {
    // Validar que el slot existe
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id: dto.slotId },
      include: { event: true },
    });

    if (!slot) {
      throw new NotFoundException('El horario especificado no existe');
    }

    // Validar que el día coincide con el evento del slot
    if (slot.event.id !== dto.dayId) {
      throw new BadRequestException(
        'El día especificado no coincide con el horario',
      );
    }

    // Transacción atómica para control de concurrencia
    const reservation = await this.prisma.$transaction(
      async (tx) => {
        // Re-lockear el slot para verificar cupos disponibles (SELECT FOR UPDATE)
        const lockedSlot = await tx.timeSlot.findUnique({
          where: { id: dto.slotId },
        });

        if (!lockedSlot) {
          throw new NotFoundException('El horario especificado no existe');
        }

        // Cupos: solo se cuentan reservas CONFIRMADAS (las pendientes no descuentan cupo)
        const reservedStudents = await tx.reservation.aggregate({
          where: {
            slotId: dto.slotId,
            status: 'confirmada',
          },
          _sum: {
            students: true,
          },
        });

        const confirmedOnly = reservedStudents._sum.students || 0;
        const available = lockedSlot.capacity - confirmedOnly;

        if (available < dto.students) {
          throw new BadRequestException(
            `Cupos insuficientes. Solo hay ${available} cupos disponibles para este horario.`,
          );
        }

        // Validar que no exista duplicado (mismo AMIE + mismo slot)
        const existingReservation = await tx.reservation.findFirst({
          where: {
            amie: dto.amie,
            slotId: dto.slotId,
            status: {
              in: ['pendiente', 'confirmada'],
            },
          },
        });

        if (existingReservation) {
          throw new ConflictException(
            'Ya existe una reserva activa para este código AMIE en este horario',
          );
        }

        // Buscar o crear la escuela automáticamente
        let school = await tx.school.findUnique({
          where: { amie: dto.amie },
        });

        if (!school) {
          // Crear la escuela si no existe
          school = await tx.school.create({
            data: {
              amie: dto.amie,
              name: dto.schoolName,
            },
          });
          this.logger.log(
            `Escuela creada automáticamente: AMIE ${dto.amie} - ${dto.schoolName}`,
          );
        }

        // Token seguro para confirmación por correo (no exponer IDs internos)
        const confirmationToken = randomBytes(32).toString('hex');

        // Crear la reserva asociada a la escuela (confirmationToken/confirmedAt en schema; tipos Prisma pueden estar en caché)
        return await tx.reservation.create({
          data: {
            amie: dto.amie,
            schoolName: dto.schoolName,
            coordinatorName: dto.coordinatorName,
            coordinatorLastName: dto.coordinatorLastName,
            email: dto.email.trim().toLowerCase(),
            whatsapp: dto.whatsapp,
            students: dto.students,
            dayId: dto.dayId,
            slotId: dto.slotId,
            status: 'pendiente',
            confirmationToken,
            schoolId: school.id,
          } as Prisma.ReservationUncheckedCreateInput,
        });
      },
      {
        isolationLevel: 'Serializable', // Máximo nivel de aislamiento para concurrencia
      },
    );

    // Enviar email de confirmación FUERA de la transacción
    // Si falla el email, no debe fallar la reserva
    let emailSent = false;
    try {
      const eventDay = await this.prisma.event.findUnique({
        where: { id: dto.dayId },
      });
      const timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id: dto.slotId },
      });

      const reservationToken = (reservation as { confirmationToken?: string | null }).confirmationToken;
      if (eventDay && timeSlot && reservationToken) {
        const dayFormatted = this.formatDate(eventDay.date);
        const slotFormatted = `${timeSlot.timeStart} - ${timeSlot.timeEnd}`;
        const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL')?.replace(/\/$/, '') || '';
        const confirmLink = backendUrl
          ? `${backendUrl}/api/reservations/confirm?token=${encodeURIComponent(reservationToken)}`
          : '';

        await this.emailService.sendReservationConfirmation({
          email: reservation.email,
          schoolName: reservation.schoolName,
          coordinatorName: reservation.coordinatorName,
          day: dayFormatted,
          slot: slotFormatted,
          students: reservation.students,
          reservationId: reservation.id,
          confirmLink,
        });
        emailSent = true;
      }
    } catch (error) {
      this.logger.error(
        `Error al enviar email de confirmación para reserva ${reservation.id}:`,
        error,
      );
      // No lanzar error, la reserva ya está creada
    }

    return {
      id: reservation.id,
      amie: reservation.amie,
      schoolName: reservation.schoolName,
      coordinatorName: reservation.coordinatorName,
      coordinatorLastName: reservation.coordinatorLastName || undefined,
      email: reservation.email,
      whatsapp: reservation.whatsapp,
      students: reservation.students,
      dayId: reservation.dayId,
      slotId: reservation.slotId,
      status: reservation.status,
      confirmedAt: (reservation as { confirmedAt?: Date | null }).confirmedAt ?? undefined,
      timestamp: reservation.timestamp,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      emailSent,
    };
  }

  /**
   * Confirma una reserva por token (enlace del correo).
   * Valida token, evita doble confirmación, opcionalmente expira en 24h.
   * Retorna la URL a la que debe redirigir (frontend con ?confirmed=true o ?confirmed=error).
   */
  async confirmByToken(token: string | undefined): Promise<{ redirectUrl: string }> {
    const frontendUrlRaw = this.configService.get<string>('FRONTEND_URL') || '';
    const frontendUrl = frontendUrlRaw.split(',')[0].trim().replace(/\/$/, '') || '';
    const baseRedirect = frontendUrl || '/';

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      this.logger.warn('Confirmación rechazada: token vacío o inválido');
      return { redirectUrl: `${baseRedirect}?confirmed=error` };
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { confirmationToken: token.trim() } as unknown as Prisma.ReservationWhereUniqueInput,
    });

    if (!reservation) {
      this.logger.warn('Confirmación rechazada: token no encontrado');
      return { redirectUrl: `${baseRedirect}?confirmed=error` };
    }

    if (reservation.status === 'confirmada') {
      this.logger.log(`Reserva ya confirmada (token reutilizado): ${reservation.id}`);
      return { redirectUrl: `${baseRedirect}?confirmed=true` };
    }

    if (reservation.status === 'cancelada') {
      this.logger.warn(`Confirmación rechazada: reserva cancelada ${reservation.id}`);
      return { redirectUrl: `${baseRedirect}?confirmed=error` };
    }

    const now = new Date();
    const createdAt = new Date(reservation.createdAt);
    if (now.getTime() - createdAt.getTime() > CONFIRMATION_TOKEN_EXPIRY_MS) {
      this.logger.warn(`Confirmación rechazada: token expirado para reserva ${reservation.id}`);
      return { redirectUrl: `${baseRedirect}?confirmed=error` };
    }

    // Transacción atómica: verificar cupos (solo confirmadas) y confirmar o cancelar
    const result = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.reservation.findUnique({
          where: { id: reservation.id },
        });
        if (!current || current.status !== 'pendiente') {
          return { redirectUrl: `${baseRedirect}?confirmed=error` };
        }

        const reservedStudents = await tx.reservation.aggregate({
          where: {
            slotId: reservation.slotId,
            status: 'confirmada',
          },
          _sum: { students: true },
        });
        const confirmedOnly = reservedStudents._sum.students || 0;
        const slot = await tx.timeSlot.findUnique({ where: { id: reservation.slotId } });
        const capacity = slot?.capacity ?? 0;
        const free = capacity - confirmedOnly;

        if (free < reservation.students) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'cancelada',
              confirmationToken: null,
            } as Prisma.ReservationUncheckedUpdateInput,
          });
          this.logger.warn(`Reserva ${reservation.id} no confirmada: sin cupos disponibles`);
          return { redirectUrl: `${baseRedirect}?confirmed=no_capacity` };
        }

        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'confirmada',
            confirmedAt: now,
            confirmationToken: null,
          } as Prisma.ReservationUncheckedUpdateInput,
        });
        this.logger.log(`Reserva confirmada correctamente: ${reservation.id}`);
        return { redirectUrl: `${baseRedirect}?confirmed=true` };
      },
      { isolationLevel: 'Serializable' },
    );

    return result;
  }

  /**
   * Obtiene todas las reservas con filtros opcionales
   */
  async findAll(filters?: {
    dayId?: string;
    slotId?: string;
    status?: string;
    amie?: string;
  }): Promise<ReservationResponseDto[]> {
    const where: any = {};

    if (filters?.dayId) {
      where.dayId = filters.dayId;
    }

    if (filters?.slotId) {
      where.slotId = filters.slotId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.amie) {
      where.amie = { contains: filters.amie, mode: 'insensitive' };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reservations.map((r) => ({
      id: r.id,
      amie: r.amie,
      schoolName: r.schoolName,
      coordinatorName: r.coordinatorName,
      coordinatorLastName: r.coordinatorLastName || undefined,
      email: r.email,
      whatsapp: r.whatsapp,
      students: r.students,
      dayId: r.dayId,
      slotId: r.slotId,
      status: r.status,
      confirmedAt: (r as { confirmedAt?: Date | null }).confirmedAt ?? undefined,
      timestamp: r.timestamp,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Obtiene una reserva por ID
   */
  async findOne(id: string): Promise<ReservationResponseDto> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return {
      id: reservation.id,
      amie: reservation.amie,
      schoolName: reservation.schoolName,
      coordinatorName: reservation.coordinatorName,
      coordinatorLastName: reservation.coordinatorLastName || undefined,
      email: reservation.email,
      whatsapp: reservation.whatsapp,
      students: reservation.students,
      dayId: reservation.dayId,
      slotId: reservation.slotId,
      status: reservation.status,
      confirmedAt: (reservation as { confirmedAt?: Date | null }).confirmedAt ?? undefined,
      timestamp: reservation.timestamp,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  /**
   * Actualiza una reserva existente
   */
  async update(
    id: string,
    dto: UpdateReservationDto,
  ): Promise<ReservationResponseDto> {
    const existingReservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Si se cambia el slot o estudiantes, validar cupos
    if (dto.slotId || dto.students !== undefined) {
      const targetSlotId = dto.slotId || existingReservation.slotId;
      const targetStudents = dto.students || existingReservation.students;

      const slot = await this.prisma.timeSlot.findUnique({
        where: { id: targetSlotId },
      });

      if (!slot) {
        throw new NotFoundException('El horario especificado no existe');
      }

      // Cupos: solo reservas confirmadas descuentan; al editar validamos que quepan los estudiantes
      const reservedStudents = await this.prisma.reservation.aggregate({
        where: {
          slotId: targetSlotId,
          status: 'confirmada',
          NOT: { id },
        },
        _sum: { students: true },
      });

      const confirmedOnly = reservedStudents._sum.students || 0;
      const available = slot.capacity - confirmedOnly;

      if (available < targetStudents) {
        throw new BadRequestException(
          `Cupos insuficientes. Solo hay ${available} cupos disponibles para este horario.`,
        );
      }
    }

    // Validar duplicado si se cambia AMIE o slot
    if (dto.amie || dto.slotId) {
      const targetAmie = dto.amie || existingReservation.amie;
      const targetSlotId = dto.slotId || existingReservation.slotId;

      const duplicate = await this.prisma.reservation.findFirst({
        where: {
          amie: targetAmie,
          slotId: targetSlotId,
          status: {
            in: ['pendiente', 'confirmada'],
          },
          NOT: {
            id: id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Ya existe una reserva activa para este código AMIE en este horario',
        );
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.amie && { amie: dto.amie }),
        ...(dto.schoolName && { schoolName: dto.schoolName }),
        ...(dto.coordinatorName && { coordinatorName: dto.coordinatorName }),
        ...(dto.coordinatorLastName !== undefined && {
          coordinatorLastName: dto.coordinatorLastName,
        }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.whatsapp && { whatsapp: dto.whatsapp }),
        ...(dto.students !== undefined && { students: dto.students }),
        ...(dto.dayId && { dayId: dto.dayId }),
        ...(dto.slotId && { slotId: dto.slotId }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return {
      id: updated.id,
      amie: updated.amie,
      schoolName: updated.schoolName,
      coordinatorName: updated.coordinatorName,
      coordinatorLastName: updated.coordinatorLastName || undefined,
      email: updated.email,
      whatsapp: updated.whatsapp,
      students: updated.students,
      dayId: updated.dayId,
      slotId: updated.slotId,
      status: updated.status,
      confirmedAt: (updated as { confirmedAt?: Date | null }).confirmedAt ?? undefined,
      timestamp: updated.timestamp,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Elimina una reserva
   */
  async remove(id: string): Promise<void> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  /**
   * Formatea la fecha en formato legible
   * Usa métodos UTC para evitar problemas de zona horaria
   */
  private formatDate(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    // Usar métodos UTC para evitar problemas de zona horaria
    const dayName = days[date.getUTCDay()];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];

    return `${dayName} ${day} ${month}`;
  }
}
