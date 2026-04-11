import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(email: string, displayName?: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`📧 Generando link de verificacion para: ${email}`);

      const actionLink = await admin.auth().generateEmailVerificationLink(email, {
        url: 'https://app.kaptah.mx/login',
      });

      this.logger.log(`✅ Link de verificacion generado correctamente`);

      const { data, error } = await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Verifica tu correo electronico - Kaptah',
        html: this.getVerificationEmailTemplate(actionLink, displayName || email),
      });

      if (error) {
        this.logger.error(`❌ Error al enviar email de verificacion: ${JSON.stringify(error)}`);
        return { success: false, message: 'Error al enviar el correo de verificacion' };
      }

      this.logger.log(`✅ Email de verificacion enviado: ${data?.id}`);
      return { success: true, message: 'Correo de verificacion enviado exitosamente' };
    } catch (error) {
      this.logger.error(`❌ Error en sendVerificationEmail: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔑 Generando link de reset para: ${email}`);

      const actionLink = await admin.auth().generatePasswordResetLink(email, {
        url: 'https://app.kaptah.mx/reset-password',
      });

      this.logger.log(`✅ Link de reset generado correctamente`);

      let displayName = email;
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        if (userRecord.displayName) {
          displayName = userRecord.displayName;
        }
      } catch (e) {}

      const { data, error } = await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Restablece tu contrasena - Kaptah',
        html: this.getPasswordResetEmailTemplate(actionLink, displayName),
      });

      if (error) {
        this.logger.error(`❌ Error al enviar email de reset: ${JSON.stringify(error)}`);
        return { success: false, message: 'Error al enviar el correo de restablecimiento' };
      }

      this.logger.log(`✅ Email de reset enviado: ${data?.id}`);
      return { success: true, message: 'Correo de restablecimiento enviado exitosamente' };
    } catch (error) {
      this.logger.error(`❌ Error en sendPasswordResetEmail: ${error.message}`);
      return { success: true, message: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena' };
    }
  }

  private getVerificationEmailTemplate(actionLink: string, displayName: string): string {
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
              <h1 style="color:#333333;font-size:22px;margin:0 0 8px;font-weight:600;">Verifica tu correo electronico</h1>
              <div style="width:50px;height:3px;background:#7B1FA2;margin:0 0 24px;border-radius:2px;"></div>
              <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 16px;">
                Hola <strong>${displayName}</strong>,
              </p>
              <p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Gracias por registrarte en <strong style="color:#7B1FA2;">Kaptah</strong>. Para completar tu registro y comenzar a gestionar tu negocio, verifica tu direccion de correo electronico haciendo clic en el siguiente boton:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#7B1FA2;border-radius:8px;padding:0;">
                    <a href="${actionLink}" target="_blank" style="display:inline-block;padding:14px 44px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;letter-spacing:0.5px;">
                      Verificar correo electronico
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#999999;font-size:13px;line-height:1.5;margin:0 0 12px;">
                Si no puedes hacer clic en el boton, copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="color:#7B1FA2;font-size:12px;word-break:break-all;background:#f9f4fc;padding:12px;border-radius:6px;border:1px solid #e8d5f0;margin:0 0 28px;">
                ${actionLink}
              </p>
              <div style="border-top:1px solid #eeeeee;padding-top:20px;">
                <p style="color:#999999;font-size:13px;line-height:1.5;margin:0;">
                  Si no creaste una cuenta en Kaptah, puedes ignorar este mensaje con toda seguridad.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0 0 4px;">
                &copy; 2026 Kaptah. Todos los derechos reservados.
              </p>
              <p style="color:#bbbbbb;font-size:11px;margin:0;">
                Este correo fue enviado porque se registro una cuenta con esta direccion en Kaptah.
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

  private getPasswordResetEmailTemplate(actionLink: string, displayName: string): string {
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
              <h1 style="color:#333333;font-size:22px;margin:0 0 8px;font-weight:600;">Restablece tu contrasena</h1>
              <div style="width:50px;height:3px;background:#7B1FA2;margin:0 0 24px;border-radius:2px;"></div>
              <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 16px;">
                Hola <strong>${displayName}</strong>,
              </p>
              <p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Recibimos una solicitud para restablecer la contrasena de tu cuenta en <strong style="color:#7B1FA2;">Kaptah</strong>. Haz clic en el siguiente boton para crear una nueva contrasena:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#7B1FA2;border-radius:8px;padding:0;">
                    <a href="${actionLink}" target="_blank" style="display:inline-block;padding:14px 44px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;letter-spacing:0.5px;">
                      Restablecer contrasena
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#f9f4fc;border-left:4px solid #7B1FA2;border-radius:0 6px 6px 0;padding:14px 16px;">
                    <p style="color:#6A1B9A;font-size:13px;line-height:1.5;margin:0;">
                      <strong>Importante:</strong> Este enlace expirara en 1 hora por razones de seguridad.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="color:#999999;font-size:13px;line-height:1.5;margin:0 0 12px;">
                Si no puedes hacer clic en el boton, copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="color:#7B1FA2;font-size:12px;word-break:break-all;background:#f9f4fc;padding:12px;border-radius:6px;border:1px solid #e8d5f0;margin:0 0 28px;">
                ${actionLink}
              </p>
              <div style="border-top:1px solid #eeeeee;padding-top:20px;">
                <p style="color:#999999;font-size:13px;line-height:1.5;margin:0;">
                  Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contrasena actual seguira siendo la misma.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="color:#999999;font-size:12px;margin:0 0 4px;">
                &copy; 2026 Kaptah. Todos los derechos reservados.
              </p>
              <p style="color:#bbbbbb;font-size:11px;margin:0;">
                Este correo fue enviado porque se solicito un cambio de contrasena en Kaptah.
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
