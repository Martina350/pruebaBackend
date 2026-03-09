import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera un reporte en formato Excel (XLSX)
   */
  async generateExcelReport(filters?: {
    dayId?: string;
    slotId?: string;
    status?: string;
    amie?: string;
  }): Promise<Buffer> {
    const reservations = await this.getFilteredReservations(filters);

    // Si no hay reservas, crear un reporte vacío
    if (reservations.length === 0) {
      const data: any[] = [];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    // Preparar datos para Excel
    const data = reservations.map((reservation) => ({
      'Código AMIE': reservation.amie,
      'Nombre del Colegio': reservation.schoolName,
      'Coordinador': reservation.coordinatorName,
      'Apellido Coordinador': reservation.coordinatorLastName || '',
      'Email': reservation.email,
      'WhatsApp': reservation.whatsapp,
      'Estudiantes': reservation.students,
      'Día': reservation.dayId,
      'Horario': reservation.slotId,
      'Estado': reservation.status,
      'Fecha de Reserva': reservation.timestamp.toISOString(),
      'Fecha de Creación': reservation.createdAt.toISOString(),
    }));

    // Crear workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');

    // Generar buffer
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return buffer;
  }

  /**
   * Genera un reporte en formato CSV
   */
  async generateCSVReport(filters?: {
    dayId?: string;
    slotId?: string;
    status?: string;
    amie?: string;
  }): Promise<string> {
    const reservations = await this.getFilteredReservations(filters);

    // Encabezados
    const headers = [
      'Código AMIE',
      'Nombre del Colegio',
      'Coordinador',
      'Apellido Coordinador',
      'Email',
      'WhatsApp',
      'Estudiantes',
      'Día',
      'Horario',
      'Estado',
      'Fecha de Reserva',
      'Fecha de Creación',
    ];

    // Filas de datos
    const rows = reservations.map((reservation) => [
      reservation.amie,
      reservation.schoolName,
      reservation.coordinatorName,
      reservation.coordinatorLastName || '',
      reservation.email,
      reservation.whatsapp,
      reservation.students.toString(),
      reservation.dayId,
      reservation.slotId,
      reservation.status,
      reservation.timestamp.toISOString(),
      reservation.createdAt.toISOString(),
    ]);

    // Generar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Obtiene reservas filtradas
   */
  private async getFilteredReservations(filters?: {
    dayId?: string;
    slotId?: string;
    status?: string;
    amie?: string;
  }) {
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

    return this.prisma.reservation.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
