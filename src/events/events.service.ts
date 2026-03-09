import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventDayDto } from './dto/event-response.dto';
import type { ConfirmedInstitutionsResponseDto } from './dto/confirmed-institutions.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene todos los días de eventos con sus horarios y cupos disponibles
   * Calcula los cupos disponibles en tiempo real basado en las reservas
   */
  async getDaysWithSlots(): Promise<EventDayDto[]> {
    const events = await this.prisma.event.findMany({
      include: {
        timeSlots: {
          include: {
            reservations: {
              where: {
                status: {
                  in: ['pendiente', 'confirmada'],
                },
              },
            },
          },
          orderBy: {
            timeStart: 'asc',
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return events.map((event) => {
      const slots = event.timeSlots.map((slot) => {
        // Calcular estudiantes reservados en este slot
        const reservedStudents = slot.reservations.reduce(
          (sum, reservation) => sum + reservation.students,
          0,
        );

        // Calcular cupos disponibles
        const available = Math.max(0, slot.capacity - reservedStudents);

        // Formatear horario
        const time = `${slot.timeStart} - ${slot.timeEnd}`;

        return {
          id: slot.id,
          time,
          capacity: slot.capacity,
          available,
        };
      });

      // Formatear fecha del día
      const day = this.formatDate(event.date);

      return {
        id: event.id,
        day,
        slots,
      };
    });
  }

  /**
   * Obtiene instituciones confirmadas para un slot (solo nombre y estudiantes, público)
   */
  async getConfirmedInstitutions(slotId: string): Promise<ConfirmedInstitutionsResponseDto> {
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id: slotId },
      include: {
        event: true,
        reservations: {
          where: { status: 'confirmada' },
          select: { schoolName: true, students: true },
        },
      },
    });
    if (!slot) {
      throw new NotFoundException('Horario no encontrado');
    }
    const day = this.formatDate(slot.event.date);
    const time = `${slot.timeStart} - ${slot.timeEnd}`;
    const institutions = slot.reservations.map((r) => ({
      schoolName: r.schoolName,
      students: r.students,
    }));
    return { day, time, institutions };
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
    // Si la fecha viene como '2026-03-16T00:00:00.000Z', queremos mostrar 16, no 15
    const dayName = days[date.getUTCDay()];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];

    return `${dayName} ${day} ${month}`;
  }
}
