import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Valida que el código AMIE:
 * - Solo contenga letras y números (alfanumérico).
 * - Tenga como máximo 10 dígitos numéricos (no es obligatorio tener 10).
 */
export function IsAmieCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAmieCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (trimmed.length === 0) return false;
          if (!/^[A-Za-z0-9]+$/.test(trimmed)) return false;
          const digitCount = (trimmed.match(/\d/g) || []).length;
          return digitCount <= 10;
        },
        defaultMessage(args: ValidationArguments): string {
          return 'El código AMIE no puede tener más de 10 dígitos y solo puede contener letras y números.';
        },
      },
    });
  };
}
