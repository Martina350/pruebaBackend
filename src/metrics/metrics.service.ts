import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula todas las métricas generales del sistema
   */
  async getGeneralMetrics() {
    const reservations = await this.prisma.reservation.findMany({
      where: { status: 'confirmada' },
    });

    // Total de colegios únicos
    const uniqueSchools = new Set(reservations.map((r) => r.amie));
    const totalSchools = uniqueSchools.size;

    // Total de estudiantes
    const totalStudents = reservations.reduce(
      (sum, r) => sum + r.students,
      0,
    );

    // Total de capacidad global
    const allSlots = await this.prisma.timeSlot.findMany();
    const totalCapacity = allSlots.reduce((sum, slot) => sum + slot.capacity, 0);

    // Tasa de ocupación global
    const occupancyRate =
      totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0;

    // Horarios más solicitados (solo confirmadas)
    const slotDemand = await this.prisma.reservation.groupBy({
      by: ['slotId'],
      where: { status: 'confirmada' },
      _sum: {
        students: true,
      },
      _count: {
        id: true,
      },
    });

    const slotDetails = await Promise.all(
      slotDemand.map(async (slot) => {
        const slotInfo = await this.prisma.timeSlot.findUnique({
          where: { id: slot.slotId },
          include: { event: true },
        });
        return {
          slotId: slot.slotId,
          time: slotInfo
            ? `${slotInfo.timeStart} - ${slotInfo.timeEnd}`
            : 'N/A',
          day: slotInfo ? this.formatDate(slotInfo.event.date) : 'N/A',
          students: slot._sum.students || 0,
          reservations: slot._count.id,
        };
      }),
    );

    const mostRequested = slotDetails
      .sort((a, b) => b.students - a.students)
      .slice(0, 3);

    const leastRequested = slotDetails
      .sort((a, b) => a.students - b.students)
      .slice(0, 3);

    // Día con mayor demanda (solo confirmadas)
    const dayDemand = await this.prisma.reservation.groupBy({
      by: ['dayId'],
      where: { status: 'confirmada' },
      _sum: {
        students: true,
      },
    });

    let highestDemandDay = null;
    if (dayDemand.length > 0) {
      const sortedDays = dayDemand.sort(
        (a, b) => (b._sum.students || 0) - (a._sum.students || 0),
      );
      const topDay = await this.prisma.event.findUnique({
        where: { id: sortedDays[0].dayId },
      });
      if (topDay) {
        highestDemandDay = {
          day: this.formatDate(topDay.date),
          students: sortedDays[0]._sum.students || 0,
        };
      }
    }

    return {
      totalSchools,
      totalStudents,
      totalCapacity,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      mostRequestedSlots: mostRequested,
      leastRequestedSlots: leastRequested,
      highestDemandDay,
    };
  }

  /**
   * Calcula métricas por día
   */
  async getDayMetrics() {
    const events = await this.prisma.event.findMany({
      include: {
        timeSlots: {
          include: {
            reservations: {
              where: { status: 'confirmada' },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return events.map((event) => {
      const allReservations = event.timeSlots.flatMap(
        (slot) => slot.reservations,
      );
      const uniqueSchools = new Set(
        allReservations.map((r) => r.amie),
      ).size;
      const totalStudents = allReservations.reduce(
        (sum, r) => sum + r.students,
        0,
      );
      const dayCapacity = event.timeSlots.reduce(
        (sum, slot) => sum + slot.capacity,
        0,
      );
      const occupancyRate =
        dayCapacity > 0 ? (totalStudents / dayCapacity) * 100 : 0;

      const slotsDistribution = event.timeSlots.map((slot) => {
        const reservedStudents = slot.reservations.reduce(
          (sum, r) => sum + r.students,
          0,
        );
        return {
          slotId: slot.id,
          time: `${slot.timeStart} - ${slot.timeEnd}`,
          capacity: slot.capacity,
          available: slot.capacity - reservedStudents,
          occupied: reservedStudents,
          occupancyPercentage:
            slot.capacity > 0
              ? Math.round((reservedStudents / slot.capacity) * 100 * 100) / 100
              : 0,
        };
      });

      return {
        dayId: event.id,
        day: this.formatDate(event.date),
        totalSchools: uniqueSchools,
        totalStudents,
        capacity: dayCapacity,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        slots: slotsDistribution,
      };
    });
  }

  /**
   * Calcula métricas por horario
   */
  async getSlotMetrics() {
    const slots = await this.prisma.timeSlot.findMany({
      include: {
        event: true,
        reservations: {
          where: { status: 'confirmada' },
        },
      },
    });

    return slots.map((slot) => {
      const reservedStudents = slot.reservations.reduce(
        (sum, r) => sum + r.students,
        0,
      );
      const uniqueSchools = new Set(
        slot.reservations.map((r) => r.amie),
      ).size;

      return {
        slotId: slot.id,
        day: this.formatDate(slot.event.date),
        time: `${slot.timeStart} - ${slot.timeEnd}`,
        capacity: slot.capacity,
        available: slot.capacity - reservedStudents,
        occupied: reservedStudents,
        schools: uniqueSchools,
        students: reservedStudents,
        occupancyPercentage:
          slot.capacity > 0
            ? Math.round((reservedStudents / slot.capacity) * 100 * 100) / 100
            : 0,
      };
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
