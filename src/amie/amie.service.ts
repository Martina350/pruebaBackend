import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AmieService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca una institución educativa por código AMIE
   * Consulta la tabla de escuelas en la base de datos
   */
  async findByCode(code: string): Promise<{ amie: string; schoolName: string }> {
    const school = await this.prisma.school.findUnique({
      where: { amie: code },
    });

    if (!school) {
      throw new NotFoundException(
        `Institución con código AMIE ${code} no encontrada. Por favor, ingrese el nombre manualmente.`,
      );
    }

    return {
      amie: school.amie,
      schoolName: school.name,
    };
  }
}
