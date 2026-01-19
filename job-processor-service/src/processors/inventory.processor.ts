import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface InventoryUpdateJob {
  type: 'deduct' | 'add' | 'adjust' | 'reserve' | 'release';
  empresaId: string;
  almacenId: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    lote?: string;
    costo?: number;
  }>;
  referenceType: 'nota-venta' | 'orden-venta' | 'recepcion-compra' | 'ajuste' | 'devolucion';
  referenceId: string;
  userId: string;
  notes?: string;
}

@Processor(QueueName.INVENTORY_UPDATE)
export class InventoryProcessor {
  private readonly logger = new Logger(InventoryProcessor.name);
  private readonly INVENTORY_API_URL = process.env.INVENTORY_API_URL || 'http://inventory-api:4005';

  constructor(
    private readonly httpService: HttpService,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
  ) {}

  @Process({ 
    name: 'actualizar-inventario', 
    concurrency: 10 
  })
  async updateInventory(job: Job<InventoryUpdateJob>): Promise<any> {
    const { type, empresaId, almacenId, items, referenceType, referenceId, userId, notes } = job.data;

    this.logger.log(`Actualizando inventario: ${type} - ${items.length} items`);

    try {
      const results = [];

      for (const item of items) {
        // 1. Obtener producto
        const producto = await this.getProducto(item.productoId, empresaId);

        if (!producto) {
          this.logger.warn(`Producto ${item.productoId} no encontrado`);
          results.push({
            productoId: item.productoId,
            success: false,
            error: 'Producto no encontrado'
          });
          continue;
        }

        // 2. Validar existencia (para deducciones)
        if (type === 'deduct') {
          const existencia = await this.getExistencia(item.productoId, almacenId);
          
          if (existencia < item.cantidad) {
            this.logger.warn(
              `Stock insuficiente: ${producto.nombre} (Disponible: ${existencia}, Requerido: ${item.cantidad})`
            );
            
            // Notificar stock bajo
            await this.notificationQueue.add('stock-insuficiente', {
              userId,
              empresaId,
              productoId: item.productoId,
              productoNombre: producto.nombre,
              existencia,
              cantidadRequerida: item.cantidad
            }, { priority: 1 });

            results.push({
              productoId: item.productoId,
              success: false,
              error: 'Stock insuficiente'
            });
            continue;
          }
        }

        // 3. Realizar movimiento
        const movimiento = await this.createMovimiento({
          empresaId,
          almacenId,
          productoId: item.productoId,
          tipo: type,
          cantidad: item.cantidad,
          lote: item.lote,
          costo: item.costo,
          referenceType,
          referenceId,
          userId,
          notes
        });

        results.push({
          productoId: item.productoId,
          success: true,
          movimientoId: movimiento.id,
          existenciaAnterior: movimiento.existenciaAnterior,
          existenciaNueva: movimiento.existenciaNueva
        });

        // 4. Verificar punto de reorden
        if (type === 'deduct') {
          await this.checkPuntoReorden(
            producto,
            movimiento.existenciaNueva,
            almacenId,
            userId,
            empresaId
          );
        }

        this.logger.log(
          `✓ Movimiento ${type}: ${producto.nombre} - ${item.cantidad} unidades`
        );
      }

      const exitosos = results.filter(r => r.success).length;
      const fallidos = results.filter(r => !r.success).length;

      return {
        success: true,
        total: items.length,
        exitosos,
        fallidos,
        detalles: results
      };

    } catch (error) {
      this.logger.error(`Error actualizando inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'deducir-stock-venta', 
    concurrency: 10 
  })
  async deductStockForSale(job: Job): Promise<any> {
    const { notaVentaId, items, almacenId, empresaId, userId } = job.data;

    return await this.updateInventory({
      data: {
        type: 'deduct',
        empresaId,
        almacenId,
        items,
        referenceType: 'nota-venta',
        referenceId: notaVentaId,
        userId
      }
    } as Job<InventoryUpdateJob>);
  }

  @Process({ 
    name: 'agregar-stock-compra', 
    concurrency: 5 
  })
  async addStockFromPurchase(job: Job): Promise<any> {
    const { recepcionId, items, almacenId, empresaId, userId } = job.data;

    return await this.updateInventory({
      data: {
        type: 'add',
        empresaId,
        almacenId,
        items,
        referenceType: 'recepcion-compra',
        referenceId: recepcionId,
        userId
      }
    } as Job<InventoryUpdateJob>);
  }

  @Process({ 
    name: 'reservar-stock', 
    concurrency: 10 
  })
  async reserveStock(job: Job): Promise<any> {
    const { ordenVentaId, items, almacenId, empresaId, userId } = job.data;

    return await this.updateInventory({
      data: {
        type: 'reserve',
        empresaId,
        almacenId,
        items,
        referenceType: 'orden-venta',
        referenceId: ordenVentaId,
        userId,
        notes: 'Stock reservado para orden de venta'
      }
    } as Job<InventoryUpdateJob>);
  }

  @Process({ 
    name: 'liberar-stock', 
    concurrency: 10 
  })
  async releaseStock(job: Job): Promise<any> {
    const { ordenVentaId, items, almacenId, empresaId, userId } = job.data;

    return await this.updateInventory({
      data: {
        type: 'release',
        empresaId,
        almacenId,
        items,
        referenceType: 'orden-venta',
        referenceId: ordenVentaId,
        userId,
        notes: 'Liberación de stock reservado'
      }
    } as Job<InventoryUpdateJob>);
  }

  @Process({ 
    name: 'ajustar-inventario', 
    concurrency: 5 
  })
  async adjustInventory(job: Job): Promise<any> {
    const { ajusteId, items, almacenId, empresaId, userId, motivo } = job.data;

    return await this.updateInventory({
      data: {
        type: 'adjust',
        empresaId,
        almacenId,
        items,
        referenceType: 'ajuste',
        referenceId: ajusteId,
        userId,
        notes: motivo
      }
    } as Job<InventoryUpdateJob>);
  }

  @Process({ 
    name: 'sincronizar-inventario', 
    concurrency: 1 // Solo 1 sincronización a la vez
  })
  async syncInventory(job: Job): Promise<any> {
    const { empresaId, almacenId } = job.data;

    this.logger.log(`Sincronizando inventario completo: almacén ${almacenId}`);

    try {
      // Recalcular todas las existencias
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.INVENTORY_API_URL}/inventario/sincronizar`,
          { empresaId, almacenId },
          {
            headers: {
              'Authorization': `Bearer ${await this.getServiceToken()}`
            },
            timeout: 300000 // 5 minutos
          }
        )
      );

      return {
        success: true,
        productosActualizados: response.data.productosActualizados
      };

    } catch (error) {
      this.logger.error(`Error sincronizando inventario: ${error.message}`);
      throw error;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async getProducto(productoId: string, empresaId: string): Promise<any> {
  try {
    // 👇 AGREGAR TIPADO
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.get(`${this.INVENTORY_API_URL}/productos/${productoId}`, {
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

private async getExistencia(productoId: string, almacenId: string): Promise<number> {
  try {
    // 👇 AGREGAR TIPADO
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.get(
        `${this.INVENTORY_API_URL}/inventario/existencia`,
        {
          params: { productoId, almacenId },
          headers: {
            'Authorization': `Bearer ${await this.getServiceToken()}`
          }
        }
      )
    );
    return response.data.existencia || 0;
  } catch {
    return 0;
  }
}

private async createMovimiento(data: any): Promise<any> {
  // 👇 AGREGAR TIPADO
  const response: AxiosResponse = await firstValueFrom(
    this.httpService.post(`${this.INVENTORY_API_URL}/movimientos`, data, {
      headers: {
        'Authorization': `Bearer ${await this.getServiceToken()}`
      }
    })
  );
  return response.data;
}

   

  private async checkPuntoReorden(
    producto: any,
    existenciaActual: number,
    almacenId: string,
    userId: string,
    empresaId: string
  ): Promise<void> {
    if (!producto.puntoReorden) return;

    if (existenciaActual <= producto.puntoReorden) {
      await this.notificationQueue.add('punto-reorden-alcanzado', {
        userId,
        empresaId,
        productoId: producto.id,
        productoNombre: producto.nombre,
        existenciaActual,
        puntoReorden: producto.puntoReorden,
        almacenId
      }, { priority: 2 });

      this.logger.warn(
        `⚠️ Punto de reorden alcanzado: ${producto.nombre} (${existenciaActual}/${producto.puntoReorden})`
      );
    }
  }

  private async getServiceToken(): Promise<string> {
    return 'service-token-123'; // Mock
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ Inventario actualizado: ${result.exitosos}/${result.total} items`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Actualización inventario falló: Job ${job.id} - ${error.message}`);
  }
}