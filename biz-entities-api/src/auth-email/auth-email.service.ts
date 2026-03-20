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
      this.logger.log(`📧 Generando link de verificación para: ${email}`);

      const actionLink = await admin.auth().generateEmailVerificationLink(email, {
        url: 'https://app.kaptah.mx/login',
      });

      this.logger.log(`✅ Link de verificación generado correctamente`);

      const { data, error } = await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Verifica tu dirección de correo electrónico - Kaptah',
        html: this.getVerificationEmailTemplate(actionLink, displayName || email),
      });

      if (error) {
        this.logger.error(`❌ Error al enviar email de verificación: ${JSON.stringify(error)}`);
        return { success: false, message: 'Error al enviar el correo de verificación' };
      }

      this.logger.log(`✅ Email de verificación enviado: ${data?.id}`);
      return { success: true, message: 'Correo de verificación enviado exitosamente' };
    } catch (error) {
      this.logger.error(`❌ Error en sendVerificationEmail: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔑 Generando link de reset de contraseña para: ${email}`);

      const actionLink = await admin.auth().generatePasswordResetLink(email, {
        url: 'https://app.kaptah.mx/login',
      });

      this.logger.log(`✅ Link de reset generado correctamente`);

      let displayName = email;
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        if (userRecord.displayName) {
          displayName = userRecord.displayName;
        }
      } catch (e) {
        // Si no encuentra el usuario, usamos el email como nombre
      }

      const { data, error } = await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Restablece tu contraseña - Kaptah',
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
      return { success: true, message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña' };
    }
  }

  private getVerificationEmailTemplate(actionLink: string, displayName: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu correo - Kaptah</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%); padding: 40px 40px 30px; text-align: center;">
              <img src="https://res.cloudinary.com/kaptah/image/upload/v1/kaptah/logo-white.png" alt="Kaptah" width="180" style="max-width: 180px; height: auto;" />
              <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 12px 0 0; letter-spacing: 1px;">GESTION EMPRESARIAL INTELIGENTE</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #1a237e; font-size: 24px; margin: 0 0 8px; font-weight: 600;">Verifica tu correo electronico</h1>
              <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #1a237e, #3949ab); margin: 0 0 24px; border-radius: 2px;"></div>
              <p style="color: #424242; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hola <strong>${displayName}</strong>,
              </p>
              <p style="color: #616161; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Gracias por registrarte en Kaptah. Para completar tu registro y comenzar a gestionar tu negocio, verifica tu direccion de correo electronico haciendo clic en el siguiente boton:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1a237e, #3949ab); border-radius: 8px; padding: 0;">
                    <a href="${actionLink}" target="_blank" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                      Verificar correo electronico
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #9e9e9e; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
                Si no puedes hacer clic en el boton, copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="color: #3949ab; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0 0 24px;">
                ${actionLink}
              </p>
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <p style="color: #9e9e9e; font-size: 13px; line-height: 1.5; margin: 0;">
                  Si no creaste una cuenta en Kaptah, puedes ignorar este mensaje con toda seguridad.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #9e9e9e; font-size: 12px; margin: 0 0 4px;">
                &copy; 2026 Kaptah. Todos los derechos reservados.
              </p>
              <p style="color: #bdbdbd; font-size: 11px; margin: 0;">
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
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablece tu contrasena - Kaptah</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%); padding: 40px 40px 30px; text-align: center;">
              <img src="https://res.cloudinary.com/kaptah/image/upload/v1/kaptah/logo-white.png" alt="Kaptah" width="180" style="max-width: 180px; height: auto;" />
              <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 12px 0 0; letter-spacing: 1px;">GESTION EMPRESARIAL INTELIGENTE</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #1a237e; font-size: 24px; margin: 0 0 8px; font-weight: 600;">Restablece tu contrasena</h1>
              <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #1a237e, #3949ab); margin: 0 0 24px; border-radius: 2px;"></div>
              <p style="color: #424242; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hola <strong>${displayName}</strong>,
              </p>
              <p style="color: #616161; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Recibimos una solicitud para restablecer la contrasena de tu cuenta en Kaptah. Haz clic en el siguiente boton para crear una nueva contrasena:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #e65100, #ff6d00); border-radius: 8px; padding: 0;">
                    <a href="${actionLink}" target="_blank" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                      Restablecer contrasena
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="background-color: #fff3e0; border-left: 4px solid #ff6d00; border-radius: 0 6px 6px 0; padding: 14px 16px;">
                    <p style="color: #e65100; font-size: 13px; line-height: 1.5; margin: 0;">
                      <strong>Importante:</strong> Este enlace expirara en 1 hora por razones de seguridad.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="color: #9e9e9e; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
                Si no puedes hacer clic en el boton, copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="color: #3949ab; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0 0 24px;">
                ${actionLink}
              </p>
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <p style="color: #9e9e9e; font-size: 13px; line-height: 1.5; margin: 0;">
                  Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contrasena actual seguira siendo la misma.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #9e9e9e; font-size: 12px; margin: 0 0 4px;">
                &copy; 2026 Kaptah. Todos los derechos reservados.
              </p>
              <p style="color: #bdbdbd; font-size: 11px; margin: 0;">
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