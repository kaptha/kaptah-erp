import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as admin from 'firebase-admin';

interface PlanConfig {
  name: string;
  mensual: number;
  anual: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.conekta.io';

  private readonly planes: Record<string, PlanConfig> = {
    basico: {
      name: 'Kaptah Basico',
      mensual: 0,
      anual: 59900,
    },
    fiscal: {
      name: 'Kaptah Fiscal',
      mensual: 29900,
      anual: 299000,
    },
    erp: {
      name: 'Kaptah ERP',
      mensual: 59900,
      anual: 599000,
    },
    ilimitado: {
      name: 'Kaptah Ilimitado',
      mensual: 99900,
      anual: 999000,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CONEKTA_PRIVATE_KEY');
  }

  async createCheckoutOrder(
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

    const body = {
      currency: 'MXN',
      customer_info: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      line_items: [
        {
          name: itemName,
          unit_price: unitPrice,
          quantity: 1,
        },
      ],
      checkout: {
        type: 'Integration',
        allowed_payment_methods: ['card', 'cash', 'bank_transfer'],
        name: itemName,
      },
      metadata: {
        firebaseUid,
        plan,
        cicloFacturacion: ciclo,
      },
    };

    try {
      this.logger.log(`Creando orden Conekta: ${itemName} para ${customerEmail}`);

      const res = await axios.post(`${this.apiUrl}/orders`, body, {
        headers: {
          Accept: 'application/vnd.conekta-v2.2.0+json',
          'Accept-Language': 'es',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      this.logger.log(`Orden creada exitosamente: ${res.data.id}`);

      return {
        checkoutRequestId: res.data.checkout.id,
        orderId: res.data.id,
        amount: unitPrice,
        plan,
        cicloFacturacion: ciclo,
      };
    } catch (error) {
      this.logger.error('Error al crear orden en Conekta:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.details?.[0]?.message || 'Error al crear la orden de pago',
      );
    }
  }

  async handleWebhook(event: any) {
    this.logger.log(`Webhook recibido: ${event.type}`);

    if (event.type === 'order.paid') {
      const order = event.data.object;
      const metadata = order.metadata;

      if (!metadata?.firebaseUid || !metadata?.plan) {
        this.logger.warn('Webhook order.paid sin metadata valida');
        return { received: true, processed: false };
      }

      await this.activateSubscription(
        metadata.firebaseUid,
        metadata.plan,
        metadata.cicloFacturacion,
        order.id,
      );

      return { received: true, processed: true };
    }

    if (event.type === 'order.expired') {
      this.logger.warn(`Orden expirada: ${event.data.object.id}`);
      return { received: true, processed: false };
    }

    return { received: true };
  }

  private async activateSubscription(
    firebaseUid: string,
    plan: string,
    cicloFacturacion: string,
    conektaOrderId: string,
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
        conektaOrderId,
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
