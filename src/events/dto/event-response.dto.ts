export class TimeSlotDto {
  id: string;
  time: string;
  capacity: number;
  available: number;
}

export class EventDayDto {
  id: string;
  day: string;
  slots: TimeSlotDto[];
}
