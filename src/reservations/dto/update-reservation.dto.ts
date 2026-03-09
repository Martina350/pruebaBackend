import {
  IsString,
  IsEmail,
  IsInt,
  Min,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { IsAmieCode } from './validators/amie-code.validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @IsAmieCode({ message: 'El código AMIE no puede tener más de 10 dígitos.' })
  amie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'El nombre del colegio es muy largo' })
  schoolName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre del coordinador es muy largo' })
  coordinatorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El apellido del coordinador es muy largo' })
  coordinatorLastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(255, { message: 'El email es muy largo' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El WhatsApp debe tener 10 dígitos' })
  whatsapp?: string;

  @IsOptional()
  @IsInt({ message: 'El número de estudiantes debe ser un número entero' })
  @Min(1, { message: 'Debe haber al menos 1 estudiante' })
  students?: number;

  @IsOptional()
  @IsString()
  dayId?: string;

  @IsOptional()
  @IsString()
  slotId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'confirmada', 'cancelada'], {
    message: 'El estado debe ser: pendiente, confirmada o cancelada',
  })
  status?: string;
}
