import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    
    // Solo crear cliente Resend si hay API key configurada
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn('RESEND_API_KEY no configurada. Los emails no se enviarán.');
    }
  }

  /**
   * Envía email de confirmación de reserva
   */
  async sendReservationConfirmation(data: {
    email: string;
    schoolName: string;
    coordinatorName: string;
    day: string;
    slot: string;
    students: number;
    reservationId: string;
    confirmLink: string;
  }): Promise<void> {
    const toEmail = data.email.trim().toLowerCase();
    if (!toEmail) {
      this.logger.warn('Email de destino vacío, no se envía confirmación');
      return;
    }

    // Si no hay cliente Resend configurado, solo loguear
    if (!this.resend) {
      this.logger.warn(
        `Email no enviado (RESEND_API_KEY no configurada) para reserva ${data.reservationId} a ${toEmail}`,
      );
      return;
    }

    try {
      // Usar siempre la plantilla con botón "Confirmar Reserva" (evita depender del .hbs en dist en producción)
      const htmlTemplate = this.getDefaultTemplate();
      const template = handlebars.compile(htmlTemplate);
      const html = template({
        schoolName: data.schoolName,
        coordinatorName: data.coordinatorName,
        day: data.day,
        slot: data.slot,
        students: data.students,
        reservationId: data.reservationId,
        confirmLink: data.confirmLink || '#',
      });

      // Obtener email de origen. Resend exige dominio verificado en resend.com/domains
      // Para pruebas usa: FROM_EMAIL=onboarding@resend.dev (solo envíos de prueba)
      const fromEmail = this.configService.get<string>('FROM_EMAIL') || 
                       this.configService.get<string>('RESEND_FROM') || 
                       this.configService.get<string>('SMTP_FROM');
      const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Global Money Week';

      if (!fromEmail) {
        throw new Error('FROM_EMAIL, RESEND_FROM o SMTP_FROM debe estar configurado en las variables de entorno');
      }

      // Resend no lanza excepciones; devuelve { data, error }
      const result = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: toEmail,
        subject: 'Confirma tu reserva - Global Money Week',
        html,
      });

      if (result.error) {
        const msg = result.error.message || String(result.error);
        // Restricción de Resend: en modo prueba solo envía al correo de la cuenta
        const isTestingRestriction = /only send testing emails to your own email|verify a domain/i.test(msg);
        if (isTestingRestriction) {
          this.logger.warn(
            `Email no enviado a ${toEmail}: ${msg}. ` +
            `Para enviar a cualquier correo, verifica un dominio en resend.com/domains y usa ese dominio en FROM_EMAIL.`,
          );
          return; // No lanzar: la reserva ya se creó correctamente
        }
        this.logger.error(`Resend rechazó el envío a ${toEmail}:`, msg);
        throw new Error(msg);
      }

      this.logger.log(
        `Email de confirmación enviado a ${toEmail} (id: ${result.data?.id ?? 'N/A'}). ` +
        `Revisa bandeja de entrada y spam. FROM debe ser dominio verificado en Resend.`,
      );
    } catch (error) {
      this.logger.error(
        `Error al enviar email de confirmación a ${toEmail}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Template HTML por defecto si no existe el archivo
   */
  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #A72974 0%, #1f4b9e 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 24px; background-color: #f8f9fa; }
    .info-box { background-color: white; padding: 16px; margin: 16px 0; border-left: 4px solid #A72974; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .cta-wrap { text-align: center; margin: 24px 0; }
    .cta-btn { display: inline-block; background-color: #006837; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .cta-btn:hover { background-color: #004d26; }
    .fallback-link { margin-top: 16px; font-size: 13px; color: #6c757d; word-break: break-all; }
    .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">Global Money Week 2026</h1>
    </div>
    <div class="content">
      <h2>¡Reserva registrada!</h2>
      <p>Hola <strong>{{coordinatorName}}</strong>,</p>
      <p>Tu reserva ha sido registrada. Para confirmarla, haz clic en el botón:</p>
      
      <div class="info-box">
        <p><strong>🏫 Institución:</strong> {{schoolName}}</p>
        <p><strong>📅 Día:</strong> {{day}}</p>
        <p><strong>⏰ Horario:</strong> {{slot}}</p>
        <p><strong>👥 Estudiantes:</strong> {{students}}</p>
        <p><strong>🆔 Código de reserva:</strong> {{reservationId}}</p>
      </div>
      
      <div class="cta-wrap">
        <a href="{{confirmLink}}" class="cta-btn">Confirmar Reserva</a>
        <p class="fallback-link">Si el botón no funciona, copia este enlace en tu navegador:<br>{{confirmLink}}</p>
      </div>
      
      <p>Gracias por tu participación en Global Money Week 2026.</p>
    </div>
    <div class="footer">
      <p>Este es un email automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
