import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PurchaseOrder {
  id?: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  userId?: number;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: Date | string;
  expectedDate?: Date | string;
  receivedDate?: Date | string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes?: string;
  createdBy?: number;
  receivedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id?: number;
  productId: number;
  productName: string;
  productSku?: string; // 👈 Agregado
  description?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number; // 👈 Agregado (alias de unitPrice)
  subtotal: number;
  receivedQuantity?: number; // 👈 Agregado
  quantityReceived?: number; // 👈 Agregado (alias)
}

export interface CreatePurchaseOrderDto {
  supplierId: number;
  supplierName?: string; // 👈 Hacer opcional
  orderDate: Date | string;
  expectedDate?: Date | string;
  currency: string;
  status?: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'; // 👈 Agregado
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface CreatePurchaseOrderItemDto {
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitCost: number;
  taxRate?: number; // 👈 Agregado
  notes?: string; // 👈 Agregado
}

// 🆕 Interface para recibir mercancía
export interface ReceivePurchaseOrderDto {
  items: {
    purchaseOrderItemId: number;
    quantityReceived: number;
    notes?: string;
  }[];
  notes?: string;
}

// 🆕 Interface para DTO de recepción individual
export interface ReceiveOrderDto {
  items: {
    itemId: number;
    receivedQuantity: number;
  }[];
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
  private apiUrl = `${environment.inventoryApiUrl}/purchase-orders`;

  constructor(private http: HttpClient) {}

  /**
   * 🆕 Descargar PDF de orden de compra con estilo personalizado
   */
  descargarPDF(orderId: number, estilo: string = 'minimal'): Observable<Blob> {
    const url = `${this.apiUrl}/${orderId}/pdf/${estilo}`;
    
    return this.http.get(url, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        if (response.body) {
          return response.body;
        }
        throw new Error('No se recibió el PDF del servidor');
      }),
      catchError(error => {
        console.error('Error al descargar PDF:', error);
        let errorMessage = 'Error al generar el PDF de la orden de compra';
        
        if (error.status === 404) {
          errorMessage = 'Orden de compra no encontrada';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor al generar el PDF';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Obtener todas las órdenes de compra
   */
  getAll(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener una orden por ID
   */
  getById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crear nueva orden de compra
   */
  create(order: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.apiUrl, order).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar orden existente (solo DRAFT)
   */
  update(id: number, order: Partial<CreatePurchaseOrderDto>): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.apiUrl}/${id}`, order).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar orden (solo DRAFT)
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cambiar estado de la orden
   */
  changeStatus(id: number, status: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(
      `${this.apiUrl}/${id}/status?status=${status}`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recibir mercancía
   */
  receiveOrder(id: number, receiveData: ReceivePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.apiUrl}/${id}/receive`,
      receiveData
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener órdenes pendientes
   */
  getPendingOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/pending`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener órdenes por estado
   */
  getOrdersByStatus(status: string): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/status/${status}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener órdenes por proveedor
   */
  getOrdersBySupplier(supplierId: number): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/supplier/${supplierId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 🆕 Enviar orden de compra por email
   */
  sendPurchaseOrderByEmail(
    orderId: number,
    emailData: { recipientEmail: string; customMessage?: string }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${orderId}/send-email`, emailData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo de errores
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      if (error.status === 404) {
        errorMessage = 'Recurso no encontrado';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Datos inválidos';
      } else if (error.status === 401) {
        errorMessage = 'No autorizado';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else {
        errorMessage = error.error?.message || `Error del servidor: ${error.status}`;
      }
    }

    console.error('Error en PurchaseOrderService:', error);
    return throwError(() => new Error(errorMessage));
  }
}