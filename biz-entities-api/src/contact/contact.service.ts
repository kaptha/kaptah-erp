import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendContactEmail(dto: ContactDto): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Nuevo mensaje de contacto de: ${dto.name} <${dto.email}>`);

      const { data, error } = await this.resend.emails.send({
        from: 'Kaptah Landing <no-reply@kaptah.mx>',
        to: ['contacto@kaptah.mx'],
        replyTo: dto.email,
        subject: `[Contacto Landing] ${dto.subject}`,
        html: this.getContactEmailTemplate(dto),
      });

      if (error) {
        this.logger.error(`Error al enviar email de contacto: ${JSON.stringify(error)}`);
        return { success: false, message: 'Error al enviar el mensaje' };
      }

      this.logger.log(`Email de contacto enviado: ${data?.id}`);
      return { success: true, message: 'Mensaje enviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error en sendContactEmail: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private getContactEmailTemplate(dto: ContactDto): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px 24px;text-align:center;border-bottom:2px solid #7B1FA2;">
              <img src="https://res.cloudinary.com/dgfjdexyi/image/upload/v1774051561/k250_tx89ai.png" alt="Kaptah" width="200" style="max-width:200px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#333333;font-size:22px;margin:0 0 8px;font-weight:600;">Nuevo mensaje de contacto</h1>
              <div style="width:50px;height:3px;background:#7B1FA2;margin:0 0 24px;border-radius:2px;"></div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background:#f9f4fc;border-radius:8px;margin-bottom:8px;">
                    <p style="color:#999;font-size:12px;margin:0 0 4px;text-transform:uppercase;font-weight:600;">Nombre</p>
                    <p style="color:#333;font-size:15px;margin:0;font-weight:500;">${dto.name}</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#f9f4fc;border-radius:8px;">
                    <p style="color:#999;font-size:12px;margin:0 0 4px;text-transform:uppercase;font-weight:600;">Email</p>
                    <p style="color:#7B1FA2;font-size:15px;margin:0;font-weight:500;">${dto.email}</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#f9f4fc;border-radius:8px;">
                    <p style="color:#999;font-size:12px;margin:0 0 4px;text-transform:uppercase;font-weight:600;">Telefono</p>
                    <p style="color:#333;font-size:15px;margin:0;font-weight:500;">${dto.phone || 'No proporcionado'}</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#f9f4fc;border-radius:8px;">
                    <p style="color:#999;font-size:12px;margin:0 0 4px;text-transform:uppercase;font-weight:600;">Asunto</p>
                    <p style="color:#333;font-size:15px;margin:0;font-weight:600;">${dto.subject}</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:16px;background:#f9f4fc;border-radius:8px;border-left:4px solid #7B1FA2;">
                    <p style="color:#999;font-size:12px;margin:0 0 8px;text-transform:uppercase;font-weight:600;">Mensaje</p>
                    <p style="color:#333;font-size:15px;margin:0;line-height:1.6;white-space:pre-wrap;">${dto.message}</p>
                  </td>
                </tr>
              </table>

              <p style="color:#999;font-size:13px;margin:0;">
                Puedes responder directamente a este correo para contactar a <strong>${dto.name}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0;">
                &copy; 2026 Kaptah. Mensaje enviado desde el formulario de contacto de kaptah.mx
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}