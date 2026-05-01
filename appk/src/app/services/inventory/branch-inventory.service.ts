import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface BranchInventory {
  id: number;
  userId: string;
  branch_id: number;
  product_id: number;
  quantity: number;
  min_stock: number;
  max_stock: number | null;
  cost: number;
  last_movement_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BranchInventoryWithDetails extends BranchInventory {
  product_name: string;
  product_code: string;
  branch_alias: string;
  total_value: number;
  stock_status: 'ok' | 'low' | 'critical' | 'out';
}

export interface CreateBranchInventoryDto {
  userId: string;
  branch_id: number;
  product_id: number;
  quantity: number;
  min_stock?: number;
  max_stock?: number;
  cost?: number;
}

export interface UpdateBranchInventoryDto {
  quantity?: number;
  min_stock?: number;
  max_stock?: number;
  cost?: number;
}

export interface FilterBranchInventoryDto {
  userId?: string;
  branch_id?: number;
  product_id?: number;
  stock_status?: 'ok' | 'low' | 'critical' | 'out';
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchInventoryService {
  private apiUrl = 'https://selfless-analysis-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getInventory(filters?: FilterBranchInventoryDto): Observable<BranchInventoryWithDetails[]> {
  const headers = this.getHeaders();
  const params: any = {};

  if (filters?.branch_id) params.branch_id = filters.branch_id.toString();
  if (filters?.product_id) params.product_id = filters.product_id.toString();
  if (filters?.stock_status) params.stock_status = filters.stock_status;
  if (filters?.search) params.search = filters.search;

  // Obtener firebaseUid del token
  const token = localStorage.getItem('idToken');
  if (!token) {
    return throwError(() => new Error('No token found'));
  }

  // Decodificar el token para obtener el firebaseUid
  const cuentaUid = localStorage.getItem('activeCuentaUid');
  const payload = JSON.parse(atob(token.split('.')[1]));
  const firebaseUid = cuentaUid || payload.user_id;

  return this.http.get<BranchInventoryWithDetails[]>(
    `${this.apiUrl}/branch-inventory/firebase/${firebaseUid}?cuentaUid=${firebaseUid}`,
    { headers, params }
  ).pipe(
    tap(response => console.log('Inventario recibido:', response)),
    catchError(error => {
      console.error('Error al obtener inventario:', error);
      return throwError(() => error);
    })
  );
}

  getInventoryByBranch(branchId: number): Observable<BranchInventoryWithDetails[]> {
    return this.getInventory({ branch_id: branchId });
  }

  getInventoryItem(id: number): Observable<BranchInventory> {
    const headers = this.getHeaders();
    return this.http.get<BranchInventory>(`${this.apiUrl}/branch-inventory/${id}`, { headers }).pipe(
      tap(response => console.log('Item de inventario:', response)),
      catchError(error => {
        console.error('Error al obtener item de inventario:', error);
        return throwError(() => error);
      })
    );
  }

  getInventoryValue(branchId: number): Observable<number> {
    const headers = this.getHeaders();
    return this.http.get<number>(`${this.apiUrl}/branch-inventory/value/${branchId}`, { headers }).pipe(
      tap(response => console.log(`Valor total sucursal ${branchId}:`, response)),
      catchError(error => {
        console.error('Error al obtener valor de inventario:', error);
        return throwError(() => error);
      })
    );
  }

  createInventory(data: CreateBranchInventoryDto): Observable<BranchInventory> {
  const headers = this.getHeaders();
  
  // Obtener firebaseUid del token
  const token = localStorage.getItem('idToken');
  if (!token) {
    return throwError(() => new Error('No token found'));
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const cuentaUid = localStorage.getItem('activeCuentaUid');
  const firebaseUid = cuentaUid || payload.user_id;

  console.log('Creando inventario:', data);
  return this.http.post<BranchInventory>(
    `${this.apiUrl}/branch-inventory/firebase/${firebaseUid}`,
    data,
    { headers }
  ).pipe(
    tap(response => console.log('Inventario creado:', response)),
    catchError(error => {
      console.error('Error al crear inventario:', error);
      return throwError(() => error);
    })
  );
}

  updateInventory(id: number, data: UpdateBranchInventoryDto): Observable<BranchInventory> {
  const headers = this.getHeaders();
  const token = localStorage.getItem('idToken');
  if (!token) {
    return throwError(() => new Error('No token found'));
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const firebaseUid = payload.user_id;

  console.log(`Actualizando inventario ${id}:`, data);
  return this.http.patch<BranchInventory>(
    `${this.apiUrl}/branch-inventory/firebase/${firebaseUid}/${id}?cuentaUid=${firebaseUid}`,
    data,
    { headers }
  ).pipe(
    tap(response => console.log('Inventario actualizado:', response)),
    catchError(error => {
      console.error('Error al actualizar inventario:', error);
      return throwError(() => error);
    })
  );
}

deleteInventory(id: number): Observable<void> {
  const headers = this.getHeaders();
  const token = localStorage.getItem('idToken');
  if (!token) {
    return throwError(() => new Error('No token found'));
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const firebaseUid = payload.user_id;

  return this.http.delete<void>(
    `${this.apiUrl}/branch-inventory/firebase/${firebaseUid}/${id}?cuentaUid=${firebaseUid}`,
    { headers }
  ).pipe(
    tap(() => console.log(`Inventario ${id} eliminado`)),
    catchError(error => {
      console.error('Error al eliminar inventario:', error);
      return throwError(() => error);
    })
  );
}

  getLowStockItems(branchId?: number): Observable<BranchInventoryWithDetails[]> {
    return this.getInventory({ 
      branch_id: branchId,
      stock_status: 'low' 
    });
  }

  getCriticalStockItems(branchId?: number): Observable<BranchInventoryWithDetails[]> {
    return this.getInventory({ 
      branch_id: branchId,
      stock_status: 'critical' 
    });
  }

  getOutOfStockItems(branchId?: number): Observable<BranchInventoryWithDetails[]> {
    return this.getInventory({ 
      branch_id: branchId,
      stock_status: 'out' 
    });
  }
}
