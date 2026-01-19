import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';

export interface AccountPayable {
  id: string;
  user_id: string;
  account_type: 'payable';
  partner_id: string;
  cfdi_id?: string;
  total_amount: number;
  paid_amount: number;
  credit_days: number;
  credit_remaining_days: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// ✅ Interfaz para la respuesta del backend
export interface AccountPayable {
  id: string;
  userId: string;
  accountType: 'payable';
  partnerId: string;
  providerName?: string;
  providerRfc?: string;
  providerInfo?: {          // ✅ AGREGAR
    id: number;
    nombre: string;
    rfc: string;
    razonSocial?: string;
    // otros campos del proveedor
  };
  cfdiId?: string;
  totalAmount: number;
  paidAmount: number;
  creditDays: number;
  creditRemainingDays: number;
  dueDate: string;
  issueDate?: string;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  concept?: string;
  documentType?: string;
  documentNumber?: string;
  notes?: string;
}

// ✅ DTO para crear cuenta por pagar
export interface CreateAccountPayableDto {
  // Campos requeridos
  partnerId: number;
  providerId: number;
  providerName: string;
  providerRfc: string;           // ✅ AGREGAR RFC del proveedor
  totalAmount: number;
  creditDays: number;
  dueDate: string;
  concept: string;
  
  // Campos opcionales
  issueDate?: string;
  documentId?: string;
  documentNumber?: string;
  documentType?: string;
  documentReference?: string;
  notes?: string;
}

// ✅ DTO para actualizar cuenta por pagar
export interface UpdateAccountPayableDto {
  partnerId?: number;
  providerId?: number;
  providerName?: string;
  providerRfc?: string;          // ✅ AGREGAR
  totalAmount?: number;
  creditDays?: number;
  creditRemainingDays?: number;
  dueDate?: string;
  issueDate?: string;
  concept?: string;
  documentId?: string;
  documentNumber?: string;
  documentType?: string;
  documentReference?: string;
  notes?: string;
}

export interface PaymentData {
  amount: number;
  paymentMethod?: string;
  paymentDate: string;
  description?: string;
  reference?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsPayableService {
  private apiUrl = 'http://localhost:3003/accounts-payable';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): Observable<HttpHeaders> {
    const idToken = localStorage.getItem('idToken');
    console.log('idToken:', idToken?.substring(0, 20));

    if (!idToken) {
      throw new Error('No token found');
    }

    return from(this.authService.convertToJWT(idToken)).pipe(
      map((response: AuthResponse) => {
        return new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.access_token}`
        });
      })
    );
  }

  /**
   * Crea una nueva cuenta por pagar
   */
  create(data: CreateAccountPayableDto): Observable<AccountPayable> {
    console.log('Enviando datos al backend:', data);
    
    // Validación simplificada
    if (!data.providerId || data.providerId === 0) {
      return throwError('providerId es requerido');
    }
    if (!data.providerName || data.providerName.trim() === '') {
      return throwError('providerName es requerido');
    }
    if (!data.totalAmount || data.totalAmount <= 0) {
      return throwError('totalAmount es requerido');
    }
    if (!data.creditDays || data.creditDays <= 0) {
      return throwError('creditDays es requerido');
    }
    if (!data.dueDate || data.dueDate.trim() === '') {
      return throwError('dueDate es requerido');
    }
    if (!data.concept || data.concept.trim() === '') {
      return throwError('concept es requerido');
    }

    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<AccountPayable>(this.apiUrl, data, { headers });
      }),
      tap(response => console.log('Respuesta del backend:', response)),
      catchError(error => {
        console.error('Error al crear cuenta por pagar:', error);
        return throwError(error);
      })
    );
  }

  getAll(): Observable<AccountPayable[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountPayable[]>(this.apiUrl, { headers });
      })
    );
  }

  getById(id: string): Observable<AccountPayable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountPayable>(`${this.apiUrl}/${id}`, { headers });
      })
    );
  }

  update(id: string, data: UpdateAccountPayableDto): Observable<AccountPayable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.put<AccountPayable>(`${this.apiUrl}/${id}`, data, { headers });
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
      })
    );
  }

  registerPayment(id: string, paymentData: PaymentData): Observable<AccountPayable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<AccountPayable>(`${this.apiUrl}/${id}/payments`, paymentData, { headers });
      })
    );
  }

  getByStatus(status: 'pending' | 'partial' | 'paid' | 'cancelled'): Observable<AccountPayable[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountPayable[]>(`${this.apiUrl}?status=${status}`, { headers });
      })
    );
  }

  getSummary(): Observable<any> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<any>(`${this.apiUrl}/summary`, { headers });
      })
    );
  }
}