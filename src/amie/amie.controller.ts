import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AmieService } from './amie.service';
import { AmieResponseDto } from './dto/amie-response.dto';

@Controller('api/amie')
export class AmieController {
  constructor(private readonly amieService: AmieService) {}

  @Get(':code')
  async getByCode(@Param('code') code: string): Promise<AmieResponseDto> {
    try {
      const result = await this.amieService.findByCode(code);
      return {
        ...result,
        found: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al consultar el código AMIE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
