import { Module } from '@nestjs/common';
import { AmieService } from './amie.service';
import { AmieController } from './amie.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmieController],
  providers: [AmieService],
  exports: [AmieService],
})
export class AmieModule {}
