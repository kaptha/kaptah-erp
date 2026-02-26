import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface BranchTransfer {
  id: number;
  userId: string;
  transfer_number: string;
  from_branch_id: number;
  to_branch_id: number;
  status: TransferStatus;
  requested_by: string;
  approved_by: string | null;
  shipped_date: Date | null;
  received_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BranchTransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  quantity: number;
  cost: number;
  notes: string | null;
  created_at: Date;
  product_name?: string;
  product_code?: string;
}

export interface BranchTransferWithItems extends BranchTransfer {
  items: BranchTransferItem[];
  from_branch_alias: string;
  to_branch_alias: string;
  total_products: number;
  total_value: number;
}

export interface CreateTransferItemDto {
  product_id: number;
  quantity: number;
  cost?: number;
  notes?: string;
}

export interface CreateBranchTransferDto {
  userId: string;
  from_branch_id: number;
  to_branch_id: number;
  notes?: string;
  items: CreateTransferItemDto[];
}

export interface UpdateTransferStatusDto {
  status: TransferStatus;
  approved_by?: string;
  notes?: string;
}

export interface FilterBranchTransferDto {
  userId?: string;
  status?: TransferStatus;
  from_branch_id?: number;
  to_branch_id?: number;
  date_from?: string;
  date_to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchTransferService {
  private apiUrl = 'https://selfless-analysis-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtener transferencias con filtros opcionales
   */
  getTransfers(filters?: FilterBranchTransferDto): Observable<BranchTransfer[]> {
    const headers = this.getHeaders();
    const params: any = {};

    if (filters?.status) params.status = filters.status;
    if (filters?.from_branch_id) params.from_branch_id = filters.from_branch_id.toString();
    if (filters?.to_branch_id) params.to_branch_id = filters.to_branch_id.toString();
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;

    return this.http.get<BranchTransfer[]>(`${this.apiUrl}/branch-transfers`, { 
      headers, 
      params 
    }).pipe(
      tap(response => console.log('Transferencias recibidas:', response)),
      catchError(error => {
        console.error('Error al obtener transferencias:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener transferencias pendientes
   */
  getPendingTransfers(): Observable<BranchTransfer[]> {
    return this.getTransfers({ status: 'pending' });
  }

  /**
   * Obtener transferencias en tránsito
   */
  getInTransitTransfers(): Observable<BranchTransfer[]> {
    return this.getTransfers({ status: 'in_transit' });
  }

  /**
   * Obtener transferencias completadas
   */
  getCompletedTransfers(): Observable<BranchTransfer[]> {
    return this.getTransfers({ status: 'completed' });
  }

  /**
   * Obtener una transferencia por ID con todos sus detalles
   */
  getTransfer(id: number): Observable<BranchTransferWithItems> {
    const headers = this.getHeaders();
    return this.http.get<BranchTransferWithItems>(`${this.apiUrl}/branch-transfers/${id}`, { headers }).pipe(
      tap(response => console.log('Transferencia con detalles:', response)),
      catchError(error => {
        console.error('Error al obtener transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crear una nueva transferencia
   */
  createTransfer(data: CreateBranchTransferDto): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    console.log('Creando transferencia:', data);
    return this.http.post<BranchTransfer>(`${this.apiUrl}/branch-transfers`, data, { headers }).pipe(
      tap(response => console.log('Transferencia creada:', response)),
      catchError(error => {
        console.error('Error al crear transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualizar el estado de una transferencia
   */
  updateTransferStatus(id: number, data: UpdateTransferStatusDto): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    console.log(`Actualizando estado de transferencia ${id}:`, data);
    return this.http.patch<BranchTransfer>(`${this.apiUrl}/branch-transfers/${id}/status`, data, { headers }).pipe(
      tap(response => console.log('Estado de transferencia actualizado:', response)),
      catchError(error => {
        console.error('Error al actualizar estado de transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Aprobar una transferencia (cambiar a in_transit)
   */
  approveTransfer(id: number, approvedBy: string): Observable<BranchTransfer> {
    return this.updateTransferStatus(id, { 
      status: 'in_transit',
      approved_by: approvedBy
    });
  }

  /**
   * Completar una transferencia
   * IMPORTANTE: Esto ejecutará los movimientos de inventario en el backend
   */
  completeTransfer(id: number): Observable<BranchTransfer> {
    return this.updateTransferStatus(id, { status: 'completed' });
  }

  /**
   * Cancelar una transferencia
   */
  cancelTransfer(id: number, reason?: string): Observable<BranchTransfer> {
    return this.updateTransferStatus(id, { 
      status: 'cancelled',
      notes: reason
    });
  }

  /**
   * Eliminar una transferencia (solo si no está completada)
   */
  deleteTransfer(id: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.apiUrl}/branch-transfers/${id}`, { headers }).pipe(
      tap(() => console.log(`Transferencia ${id} eliminada`)),
      catchError(error => {
        console.error('Error al eliminar transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener transferencias de una sucursal específica (origen)
   */
  getTransfersFromBranch(branchId: number): Observable<BranchTransfer[]> {
    return this.getTransfers({ from_branch_id: branchId });
  }

  /**
   * Obtener transferencias hacia una sucursal específica (destino)
   */
  getTransfersToBranch(branchId: number): Observable<BranchTransfer[]> {
    return this.getTransfers({ to_branch_id: branchId });
  }
}
