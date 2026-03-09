import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está configurada');
    }

    // Prisma 7: Requiere usar un adapter
    // Render y la mayoría de clouds exigen SSL (evita P1010 "SSL/TLS required")
    const useSsl =
      databaseUrl.includes('render.com') ||
      databaseUrl.includes('neon.tech') ||
      process.env.DATABASE_SSL === 'true';
    // Conexiones inactivas se cierran antes de que el servidor las corte (evita P1017 ConnectionClosed)
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: true } : undefined,
      idleTimeoutMillis: 2 * 60 * 1000, // 2 min: cerrar conexiones inactivas antes del timeout del servidor
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
