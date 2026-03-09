export class ReservationResponseDto {
  id: string;
  amie: string;
  schoolName: string;
  coordinatorName: string;
  coordinatorLastName?: string;
  email: string;
  whatsapp: string;
  students: number;
  dayId: string;
  slotId: string;
  status: string;
  confirmedAt?: Date | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  emailSent?: boolean;
}
