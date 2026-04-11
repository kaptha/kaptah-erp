import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UsersService } from './users.service';

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
  productSku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
  receivedQuantity?: number;
  quantityReceived?: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: number;
  supplierName?: string;
  orderDate: Date | string;
  expectedDate?: Date | string;
  currency: string;
  status?: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface CreatePurchaseOrderItemDto {
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  notes?: string;
}

export interface ReceivePurchaseOrderDto {
  items: {
    purchaseOrderItemId: number;
    quantityReceived: number;
    notes?: string;
  }[];
  notes?: string;
}

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

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}
private getActiveCuentaUid(): string | null {
    return localStorage.getItem('activeCuentaUid') || null;
  }
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No se encontro token de autenticacion');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  descargarPDF(orderId: number, estilo: string = 'minimal'): Observable<Blob> {
    const url = `${this.apiUrl}/${orderId}/pdf/${estilo}`;
    const headers = this.getHeaders();

    return this.http.get(url, {
      responseType: 'blob',
      observe: 'response',
      headers
    }).pipe(
      map(response => {
        if (response.body) {
          return response.body;
        }
        throw new Error('No se recibio el PDF del servidor');
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

  getAll(): Observable<PurchaseOrder[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontro el token de autenticacion'));
    }
    const cuentaUid = this.getActiveCuentaUid();
    if (cuentaUid) {
      const headers = this.getHeaders();
      return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/firebase/${cuentaUid}`, { headers }).pipe(
        catchError(error => {
          console.error('Error al obtener ordenes:', error);
          return throwError(() => error);
        })
      );
    }
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontro el usuario');
        }
        console.log('userId:', user.id);
        const headers = this.getHeaders();
        return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/firebase/${user.id}`, { headers });
      }),
      tap(response => console.log('Ordenes recibidas:', response)),
      catchError(error => {
        console.error('Error al obtener ordenes:', error);
        return throwError(() => error);
      })
    );
  }

  getById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  create(order: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.apiUrl, order, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  update(id: number, order: Partial<CreatePurchaseOrderDto>): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.apiUrl}/${id}`, order, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  changeStatus(id: number, status: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(
      `${this.apiUrl}/${id}/status?status=${status}`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  receiveOrder(id: number, receiveData: ReceivePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.apiUrl}/${id}/receive`,
      receiveData,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPendingOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/pending`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByStatus(status: string): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/status/${status}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersBySupplier(supplierId: number): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/supplier/${supplierId}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  sendPurchaseOrderByEmail(
  orderId: number,
  emailData: { recipientEmail: string; customMessage?: string }
): Observable<any> {
  const cuentaUid = this.getActiveCuentaUid() || localStorage.getItem('firebaseUid');
  return this.http.post(
    `${this.apiUrl}/firebase/${cuentaUid}/${orderId}/send-email`,
    emailData,
    { headers: this.getHeaders() }
  ).pipe(
    catchError(this.handleError)
  );
}

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 404) {
        errorMessage = 'Recurso no encontrado';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Datos invalidos';
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
