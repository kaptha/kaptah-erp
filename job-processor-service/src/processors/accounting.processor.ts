import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

interface CxCJob {
  cfdiId: string;
  userId: string;
  empresaId: string;
  monto: number;
  clienteId?: string;
  diasCredito?: number;
}

interface CxPJob {
  cfdiId: string;
  userId: string;
  empresaId: string;
  monto: number;
  proveedorId?: string;
  diasCredito?: number;
}

@Processor(QueueName.ACCOUNTING)
export class AccountingProcessor {
  private readonly logger = new Logger(AccountingProcessor.name);
  private readonly FINANCE_API_URL = process.env.FINANCE_API_URL || 'http://finance-api:3003';

  constructor(
    private readonly httpService: HttpService,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.EMAIL) private emailQueue: Queue,
  ) {}

  @Process({ 
    name: 'crear-cxc', 
    concurrency: 5 
  })
  async crearCuentaPorCobrar(job: Job<CxCJob>): Promise<any> {
    const { cfdiId, userId, empresaId, monto, clienteId, diasCredito = 30 } = job.data;

    this.logger.log(`Creando CxC para CFDI: ${cfdiId}`);

    try {
      // 1. Obtener datos del CFDI
      const cfdi = await this.getCFDIData(cfdiId);

      // 2. Obtener o crear cliente
      const cliente = clienteId 
        ? await this.getCliente(clienteId)
        : await this.getOrCreateClienteByRFC(cfdi.receptorRfc, empresaId);

      // 3. Calcular fecha de vencimiento
      const fechaVencimiento = new Date(cfdi.fecha);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (cliente.diasCredito || diasCredito));

      // 4. Crear CxC en finance-api
      const cxcData = {
        cfdiId,
        empresaId,
        clienteId: cliente.id,
        clienteRfc: cfdi.receptorRfc,
        clienteNombre: cfdi.receptorNombre,
        folio: `${cfdi.serie}-${cfdi.folio}`,
        uuid: cfdi.uuid,
        fecha: cfdi.fecha,
        fechaVencimiento,
        moneda: cfdi.moneda,
        tipoCambio: cfdi.tipoCambio,
        subtotal: cfdi.subTotal,
        iva: cfdi.impuestos?.totalImpuestosTrasladados || 0,
        total: cfdi.total,
        saldo: cfdi.total, // Inicialmente sin pagos
        status: 'pendiente',
        diasCredito: cliente.diasCredito || diasCredito
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.FINANCE_API_URL}/cuentas-cobrar`, cxcData, {
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const cxc = response.data;

      this.logger.log(`✓ CxC creada: ${cxc.id}`);

      // 5. Si está vencida, enviar notificación
      if (new Date() > fechaVencimiento) {
        await this.notificationQueue.add('recordatorio-vencimiento', {
          userId,
          empresaId,
          facturas: [cxc]
        });
      }

      return {
        success: true,
        cxcId: cxc.id,
        cfdiId
      };

    } catch (error) {
      this.logger.error(`Error creando CxC: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'crear-cxp', 
    concurrency: 5 
  })
  async crearCuentaPorPagar(job: Job<CxPJob>): Promise<any> {
    const { cfdiId, userId, empresaId, monto, proveedorId, diasCredito = 30 } = job.data;

    this.logger.log(`Creando CxP para CFDI: ${cfdiId}`);

    try {
      // 1. Obtener datos del CFDI
      const cfdi = await this.getCFDIData(cfdiId);

      // 2. Obtener o crear proveedor
      const proveedor = proveedorId 
        ? await this.getProveedor(proveedorId)
        : await this.getOrCreateProveedorByRFC(cfdi.emisorRfc, empresaId);

      // 3. Calcular fecha de vencimiento
      const fechaVencimiento = new Date(cfdi.fecha);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (proveedor.diasCredito || diasCredito));

      // 4. Crear CxP en finance-api
      const cxpData = {
        cfdiId,
        empresaId,
        proveedorId: proveedor.id,
        proveedorRfc: cfdi.emisorRfc,
        proveedorNombre: cfdi.emisorNombre,
        folio: `${cfdi.serie}-${cfdi.folio}`,
        uuid: cfdi.uuid,
        fecha: cfdi.fecha,
        fechaVencimiento,
        moneda: cfdi.moneda,
        tipoCambio: cfdi.tipoCambio,
        subtotal: cfdi.subTotal,
        iva: cfdi.impuestos?.totalImpuestosTrasladados || 0,
        total: cfdi.total,
        saldo: cfdi.total,
        status: 'pendiente',
        diasCredito: proveedor.diasCredito || diasCredito
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.FINANCE_API_URL}/cuentas-pagar`, cxpData, {
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const cxp = response.data;

      this.logger.log(`✓ CxP creada: ${cxp.id}`);

      // 5. Si está próxima a vencer (7 días), notificar
      const diasParaVencer = Math.ceil(
        (fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (diasParaVencer <= 7 && diasParaVencer > 0) {
        await this.notificationQueue.add('recordatorio-pago-proveedor', {
          userId,
          empresaId,
          cxpId: cxp.id,
          diasParaVencer
        });
      }

      return {
        success: true,
        cxpId: cxp.id,
        cfdiId
      };

    } catch (error) {
      this.logger.error(`Error creando CxP: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'aplicar-pago', 
    concurrency: 5 
  })
  async aplicarPago(job: Job): Promise<any> {
    const { cfdiId, pagoId, monto, facturasPagadas, userId, empresaId } = job.data;

    this.logger.log(`Aplicando pago: ${pagoId}`);

    try {
      // 1. Obtener complemento de pago
      const complemento = await this.getCFDIData(cfdiId);

      // 2. Aplicar pago a cada factura relacionada
      for (const facturaPagada of facturasPagadas) {
        // Buscar CxC por UUID
        const cxc = await this.getCxCByUUID(facturaPagada.uuid, empresaId);

        if (!cxc) {
          this.logger.warn(`CxC no encontrada para UUID: ${facturaPagada.uuid}`);
          continue;
        }

        // Aplicar pago
        await firstValueFrom(
          this.httpService.post(
            `${this.FINANCE_API_URL}/cuentas-cobrar/${cxc.id}/pagos`,
            {
              complementoPagoId: cfdiId,
              monto: facturaPagada.montoPagado,
              fecha: complemento.fecha,
              formaPago: facturaPagada.formaPago,
              moneda: facturaPagada.moneda
            },
            {
              headers: {
                'Authorization': `Bearer ${await this.getServiceToken()}`
              }
            }
          )
        );

        this.logger.log(`✓ Pago aplicado a CxC ${cxc.id}: $${facturaPagada.montoPagado}`);

        // Notificar si la factura quedó pagada completamente
        if (cxc.saldo - facturaPagada.montoPagado <= 0.01) {
          await this.notificationQueue.add('factura-pagada', {
            userId,
            empresaId,
            cxcId: cxc.id,
            folio: cxc.folio
          });
        }
      }

      return {
        success: true,
        pagoId,
        facturasAfectadas: facturasPagadas.length
      };

    } catch (error) {
      this.logger.error(`Error aplicando pago: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'generar-reporte-antiguedad', 
    concurrency: 1 
  })
  async generarReporteAntiguedad(job: Job): Promise<any> {
    const { empresaId, tipo, userId } = job.data; // tipo: 'cxc' | 'cxp'

    this.logger.log(`Generando reporte de antigüedad: ${tipo}`);

    try {
      const endpoint = tipo === 'cxc' 
        ? `${this.FINANCE_API_URL}/cuentas-cobrar/reporte-antiguedad`
        : `${this.FINANCE_API_URL}/cuentas-pagar/reporte-antiguedad`;

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(endpoint, {
          params: { empresaId },
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`
          }
        })
      );

      const reportData = response.data;

      // Enviar por email
      await this.emailQueue.add('enviar-reporte', {
        userId,
        empresaId,
        reportType: `antiguedad-${tipo}`,
        data: reportData
      });

      return {
        success: true,
        reportType: tipo,
        records: reportData.length
      };

    } catch (error) {
      this.logger.error(`Error generando reporte: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'enviar-recordatorios-vencidos', 
    concurrency: 2 
  })
  async enviarRecordatoriosVencidos(job: Job): Promise<any> {
    const { empresaId } = job.data;

    this.logger.log(`Enviando recordatorios de facturas vencidas`);

    try {
      // Obtener facturas vencidas
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.FINANCE_API_URL}/cuentas-cobrar/vencidas`, {
          params: { empresaId },
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`
          }
        })
      );

      const facturasVencidas = response.data;

      // Enviar recordatorio por cada factura
      for (const factura of facturasVencidas) {
        const diasVencido = Math.ceil(
          (Date.now() - new Date(factura.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24)
        );

        await this.emailQueue.add('recordatorio-pago', {
          cxcId: factura.id,
          clienteEmail: factura.clienteEmail,
          diasVencido
        }, { priority: 2 });
      }

      this.logger.log(`✓ ${facturasVencidas.length} recordatorios enviados`);

      return {
        success: true,
        recordatoriosEnviados: facturasVencidas.length
      };

    } catch (error) {
      this.logger.error(`Error enviando recordatorios: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async getCFDIData(cfdiId: string): Promise<any> {
    // Obtener desde sales-api o directamente de DB
    return {
      id: cfdiId,
      serie: 'A',
      folio: '123',
      uuid: '12345678-1234-1234-1234-123456789012',
      fecha: new Date(),
      emisorRfc: 'AAA010101AAA',
      emisorNombre: 'Proveedor Test',
      receptorRfc: 'XAXX010101000',
      receptorNombre: 'Cliente Test',
      moneda: 'MXN',
      tipoCambio: 1,
      subTotal: 1000,
      total: 1160,
      impuestos: {
        totalImpuestosTrasladados: 160
      }
    }; // Mock
  }

  private async getCliente(clienteId: string): Promise<any> {
    // Obtener desde biz-entities-api
    return {
      id: clienteId,
      rfc: 'XAXX010101000',
      nombre: 'Cliente Test',
      diasCredito: 30
    }; // Mock
  }

  private async getProveedor(proveedorId: string): Promise<any> {
    return {
      id: proveedorId,
      rfc: 'AAA010101AAA',
      nombre: 'Proveedor Test',
      diasCredito: 30
    }; // Mock
  }

  private async getOrCreateClienteByRFC(rfc: string, empresaId: string): Promise<any> {
    // Buscar o crear cliente en biz-entities-api
    this.logger.log(`Buscando/creando cliente: ${rfc}`);
    return {
      id: `cliente-${Date.now()}`,
      rfc,
      nombre: 'Cliente Nuevo',
      diasCredito: 30
    }; // Mock
  }

  private async getOrCreateProveedorByRFC(rfc: string, empresaId: string): Promise<any> {
    this.logger.log(`Buscando/creando proveedor: ${rfc}`);
    return {
      id: `proveedor-${Date.now()}`,
      rfc,
      nombre: 'Proveedor Nuevo',
      diasCredito: 30
    }; // Mock
  }

  private async getCxCByUUID(uuid: string, empresaId: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.FINANCE_API_URL}/cuentas-cobrar/by-uuid/${uuid}`, {
          params: { empresaId },
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`
          }
        })
      );
      return response.data;
    } catch {
      return null;
    }
  }

  private async getServiceToken(): Promise<string> {
    // Generar JWT para comunicación entre servicios
    return 'service-token-123'; // Mock
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ Proceso contable completado: Job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Proceso contable falló: Job ${job.id} - ${error.message}`);
  }
}