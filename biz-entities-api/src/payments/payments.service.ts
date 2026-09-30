import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

interface PlanConfig {
  name: string;
  mensual: number;
  anual: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  private readonly planes: Record<string, PlanConfig> = {
    basico: { name: 'Kaptah Basico', mensual: 0, anual: 59900 },
    fiscal: { name: 'Kaptah Fiscal', mensual: 29900, anual: 299000 },
    erp: { name: 'Kaptah ERP', mensual: 59900, anual: 599000 },
    ilimitado: { name: 'Kaptah Ilimitado', mensual: 99900, anual: 999000 },
  };

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2026-08-26.dahlia',
    });
  }

  async createCheckoutSession(
    plan: string,
    ciclo: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    firebaseUid: string,
  ) {
    const planConfig = this.planes[plan];
    if (!planConfig) {
      throw new BadRequestException(`Plan invalido: ${plan}`);
    }

    if (plan === 'basico' && ciclo === 'mensual') {
      throw new BadRequestException('El plan Basico solo esta disponible en ciclo anual');
    }

    const unitPrice = ciclo === 'anual' ? planConfig.anual : planConfig.mensual;
    if (!unitPrice) {
      throw new BadRequestException(`Precio no disponible para ${plan} ${ciclo}`);
    }

    const cicloLabel = ciclo === 'anual' ? 'Anual' : 'Mensual';
    const itemName = `${planConfig.name} - ${cicloLabel}`;

    try {
      this.logger.log(`Creando sesion Stripe: ${itemName} para ${customerEmail}`);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        locale: 'es',
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: itemName,
                description: `Suscripcion ${planConfig.name} - Ciclo ${cicloLabel}`,
              },
              unit_amount: unitPrice,
            },
            quantity: 1,
          },
        ],
        metadata: {
          firebaseUid,
          plan,
          cicloFacturacion: ciclo,
          customerName,
          customerPhone,
        },
        success_url: 'https://app.kaptah.mx/dashboard/perfil?payment=success',
        cancel_url: 'https://app.kaptah.mx/dashboard/perfil?payment=cancelled',
      });

      this.logger.log(`Sesion creada: ${session.id}`);

      return {
        sessionId: session.id,
        url: session.url,
        plan,
        cicloFacturacion: ciclo,
      };
    } catch (error) {
      this.logger.error('Error al crear sesion Stripe:', error.message);
      throw new BadRequestException(error.message || 'Error al crear la sesion de pago');
    }
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Webhook recibido: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === 'paid') {
        const metadata = session.metadata;

        if (!metadata?.firebaseUid || !metadata?.plan) {
          this.logger.warn('Webhook sin metadata valida');
          return { received: true, processed: false };
        }

        await this.activateSubscription(
          metadata.firebaseUid,
          metadata.plan,
          metadata.cicloFacturacion,
          session.id,
        );

        return { received: true, processed: true };
      }
    }

    return { received: true };
  }

  private async activateSubscription(
    firebaseUid: string,
    plan: string,
    cicloFacturacion: string,
    stripeSessionId: string,
  ) {
    try {
      const db = admin.database();
      const snapshot = await db.ref('usuarios').orderByChild('firebaseUid').equalTo(firebaseUid).once('value');
      const data = snapshot.val();

      if (!data) {
        this.logger.error(`Usuario no encontrado en Realtime DB: ${firebaseUid}`);
        return;
      }

      const userKey = Object.keys(data)[0];
      const now = new Date().toISOString();

      await db.ref(`usuarios/${userKey}`).update({
        plan,
        suscripcionActiva: true,
        cicloFacturacion,
        enPeriodoPrueba: false,
        fechaPago: now,
        stripeSessionId,
        fechaVencimiento: this.calcularVencimiento(cicloFacturacion),
      });

      this.logger.log(`Suscripcion activada: ${firebaseUid} -> ${plan} (${cicloFacturacion})`);
    } catch (error) {
      this.logger.error(`Error al activar suscripcion: ${error.message}`);
      throw error;
    }
  }

  private calcularVencimiento(ciclo: string): string {
    const now = new Date();
    if (ciclo === 'anual') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  }
}
