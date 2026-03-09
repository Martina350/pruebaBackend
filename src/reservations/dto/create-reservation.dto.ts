import {
  IsString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { IsAmieCode } from './validators/amie-code.validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty({ message: 'El código AMIE es obligatorio' })
  @IsAmieCode({ message: 'El código AMIE no puede tener más de 10 dígitos.' })
  amie: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del colegio es obligatorio' })
  @MaxLength(255, { message: 'El nombre del colegio es muy largo' })
  schoolName: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del coordinador es obligatorio' })
  @MaxLength(100, { message: 'El nombre del coordinador es muy largo' })
  coordinatorName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El apellido del coordinador es muy largo' })
  coordinatorLastName?: string;

  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(255, { message: 'El email es muy largo' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de WhatsApp es obligatorio' })
  @Matches(/^\d{10}$/, { message: 'El WhatsApp debe tener 10 dígitos' })
  whatsapp: string;

  @IsInt({ message: 'El número de estudiantes debe ser un número entero' })
  @Min(1, { message: 'Debe haber al menos 1 estudiante' })
  students: number;

  @IsString()
  @IsNotEmpty({ message: 'El ID del día es obligatorio' })
  dayId: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del horario es obligatorio' })
  slotId: string;
}
