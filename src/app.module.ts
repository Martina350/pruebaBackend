import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { AmieModule } from './amie/amie.module';
import { ReservationsModule } from './reservations/reservations.module';
import { EmailModule } from './email/email.module';
import { MetricsModule } from './metrics/metrics.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    EventsModule,
    AmieModule,
    EmailModule,
    ReservationsModule,
    MetricsModule,
    ReportsModule,
  ],
})
export class AppModule {}
