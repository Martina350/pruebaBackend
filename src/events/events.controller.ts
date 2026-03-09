import { Controller, Get, Param } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventDayDto } from './dto/event-response.dto';
import { ConfirmedInstitutionsResponseDto } from './dto/confirmed-institutions.dto';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('days')
  async getDays(): Promise<EventDayDto[]> {
    return this.eventsService.getDaysWithSlots();
  }

  @Get('slots/:slotId/confirmed-institutions')
  async getConfirmedInstitutions(
    @Param('slotId') slotId: string,
  ): Promise<ConfirmedInstitutionsResponseDto> {
    return this.eventsService.getConfirmedInstitutions(slotId);
  }
}
