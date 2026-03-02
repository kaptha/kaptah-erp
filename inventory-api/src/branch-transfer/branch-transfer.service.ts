import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface BranchTransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  quantity: number;
  cost: number;
  notes?: string;
  product_name?: string;
  product_code?: string;
}

export interface BranchTransfer {
  id: number;
  userId: string;
  from_branch_id: number;
  to_branch_id: number;
  transfer_number: string;
  status: TransferStatus;
  requested_by: string;
  approved_by?: string;
  approved_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BranchTransferWithItems extends BranchTransfer {
  items: BranchTransferItem[];
  from_branch_alias?: string;
  to_branch_alias?: string;
  total_items: number;
  total_value: number;
}

export interface CreateTransferItemDto {
  product_id: number;
  quantity: number;
  cost: number;
  notes?: string;
}

export interface CreateBranchTransferDto {
  userId: string;
  from_branch_id: number;
  to_branch_id: number;
  requested_by: string;
  notes?: string;
  items: CreateTransferItemDto[];
}

export interface UpdateTransferStatusDto {
  status: TransferStatus;
  approved_by?: string;
  cancellation_reason?: string;
}

export interface FilterBranchTransferDto {
  from_branch_id?: number;
  to_branch_id?: number;
  status?: TransferStatus;
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

  private getFirebaseUid(): string {
    const token = localStorage.getItem('idToken');
    if (!token) throw new Error('No token found');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id;
  }

  getTransfers(filters?: FilterBranchTransferDto): Observable<BranchTransferWithItems[]> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();
    const params: any = {};

    if (filters?.from_branch_id) params.from_branch_id = filters.from_branch_id.toString();
    if (filters?.to_branch_id) params.to_branch_id = filters.to_branch_id.toString();
    if (filters?.status) params.status = filters.status;

    return this.http.get<BranchTransferWithItems[]>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}`,
      { headers, params }
    ).pipe(
      tap(response => console.log('Transferencias recibidas:', response)),
      catchError(error => {
        console.error('Error al obtener transferencias:', error);
        return throwError(() => error);
      })
    );
  }

  getTransfer(id: number): Observable<BranchTransferWithItems> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    return this.http.get<BranchTransferWithItems>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}/${id}`,
      { headers }
    ).pipe(
      tap(response => console.log('Transferencia:', response)),
      catchError(error => {
        console.error('Error al obtener transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  createTransfer(data: CreateBranchTransferDto): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    console.log('Creando transferencia:', data);
    return this.http.post<BranchTransfer>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}`,
      data,
      { headers }
    ).pipe(
      tap(response => console.log('Transferencia creada:', response)),
      catchError(error => {
        console.error('Error al crear transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  approveTransfer(id: number, approvedBy: string): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    return this.http.patch<BranchTransfer>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}/${id}/approve`,
      { approved_by: approvedBy },
      { headers }
    ).pipe(
      tap(response => console.log('Transferencia aprobada:', response)),
      catchError(error => {
        console.error('Error al aprobar transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  completeTransfer(id: number): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    return this.http.patch<BranchTransfer>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}/${id}/complete`,
      {},
      { headers }
    ).pipe(
      tap(response => console.log('Transferencia completada:', response)),
      catchError(error => {
        console.error('Error al completar transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  cancelTransfer(id: number, reason: string): Observable<BranchTransfer> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    return this.http.patch<BranchTransfer>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}/${id}/cancel`,
      { reason },
      { headers }
    ).pipe(
      tap(response => console.log('Transferencia cancelada:', response)),
      catchError(error => {
        console.error('Error al cancelar transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTransfer(id: number): Observable<void> {
    const headers = this.getHeaders();
    const firebaseUid = this.getFirebaseUid();

    return this.http.delete<void>(
      `${this.apiUrl}/branch-transfers/firebase/${firebaseUid}/${id}`,
      { headers }
    ).pipe(
      tap(() => console.log(`Transferencia ${id} eliminada`)),
      catchError(error => {
        console.error('Error al eliminar transferencia:', error);
        return throwError(() => error);
      })
    );
  }

  getPendingTransfers(): Observable<BranchTransferWithItems[]> {
    return this.getTransfers({ status: 'pending' });
  }

  getInTransitTransfers(): Observable<BranchTransferWithItems[]> {
    return this.getTransfers({ status: 'in_transit' });
  }

  getCompletedTransfers(): Observable<BranchTransferWithItems[]> {
    return this.getTransfers({ status: 'completed' });
  }
}
