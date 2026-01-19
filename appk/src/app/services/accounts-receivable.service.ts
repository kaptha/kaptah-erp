import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';

export interface AccountReceivable {
  id: string;
  user_id: string;
  account_type: 'receivable';
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

// ✅ DTO CORREGIDO para coincidir con el backend
export interface CreateAccountReceivableDto {
  // Campos requeridos que coinciden con el backend
  customerId: number;           // ✅ CAMBIO: De string a number
  customerName: string;         // ✅ AGREGADO: Campo requerido
  customerRfc: string;          // ✅ AGREGADO: Campo requerido
  totalAmount: number;
  creditDays: number;
  dueDate: string;              // Formato ISO: YYYY-MM-DD
  concept: string;              // ✅ AGREGADO: Campo requerido
  
  // Campos opcionales
  partnerId?: number;           // ✅ AGREGADO: Campo opcional
  issueDate?: string;           // ✅ AGREGADO: Campo opcional
  documentId?: string;
  documentNumber?: string;      // ✅ AGREGADO: Campo opcional
  documentType?: string;        // ✅ AGREGADO: Campo opcional
  documentReference?: string;   // ✅ AGREGADO: Campo opcional
  notes?: string;               // ✅ AGREGADO: Campo opcional
}

export interface UpdateAccountReceivableDto {
  customerId?: number;          // ✅ CAMBIO: De string a number
  customerName?: string;        // ✅ AGREGADO
  customerRfc?: string;         // ✅ AGREGADO
  totalAmount?: number;
  creditDays?: number;
  creditRemainingDays?: number; // ✅ AGREGADO
  dueDate?: string;
  issueDate?: string;           // ✅ AGREGADO
  concept?: string;             // ✅ AGREGADO
  documentId?: string;
  documentNumber?: string;      // ✅ AGREGADO
  documentType?: string;        // ✅ AGREGADO
  documentReference?: string;   // ✅ AGREGADO
  notes?: string;               // ✅ AGREGADO
}

export interface PaymentData {
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  description?: string;
  reference?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsReceivableService {
  private apiUrl = 'http://localhost:3003/accounts-receivable';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): Observable<HttpHeaders> {
    const idToken = localStorage.getItem('idToken');
    console.log('idToken:', idToken?.substring(0, 20));
    console.log('jwt_token:', localStorage.getItem('jwt_token')?.substring(0, 20));

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
   * Crea una nueva cuenta por cobrar
   */
  create(data: CreateAccountReceivableDto): Observable<AccountReceivable> {
    // ✅ VALIDACIÓN CORREGIDA: Validar correctamente los campos
    console.log('Enviando datos al backend:', data);
    
    // Validar campos requeridos con verificaciones correctas
    const missingFields: string[] = [];
    
    if (!data.customerId || data.customerId === 0) {
      missingFields.push('customerId');
    }
    if (!data.customerName || data.customerName.trim() === '') {
      missingFields.push('customerName');
    }
    if (!data.customerRfc || data.customerRfc.trim() === '') {
      missingFields.push('customerRfc');
    }
    if (!data.totalAmount || data.totalAmount <= 0) {
      missingFields.push('totalAmount');
    }
    if (!data.creditDays || data.creditDays <= 0) {
      missingFields.push('creditDays');
    }
    if (!data.dueDate || data.dueDate.trim() === '') {
      missingFields.push('dueDate');
    }
    if (!data.concept || data.concept.trim() === '') {
      missingFields.push('concept');
    }
    
    if (missingFields.length > 0) {
      console.error('Campos requeridos faltantes:', missingFields);
      console.error('Datos recibidos:', data);
      return throwError(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }

    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<AccountReceivable>(this.apiUrl, data, { headers });
      }),
      tap(response => console.log('Respuesta del backend:', response)),
      catchError(error => {
        console.error('Error al crear cuenta por cobrar:', error);
        return throwError(error);
      })
    );
  }

  // ... resto de los métodos permanecen igual
  getAll(): Observable<AccountReceivable[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountReceivable[]>(this.apiUrl, { headers });
      })
    );
  }

  getById(id: string): Observable<AccountReceivable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountReceivable>(`${this.apiUrl}/${id}`, { headers });
      })
    );
  }

  update(id: string, data: UpdateAccountReceivableDto): Observable<AccountReceivable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.put<AccountReceivable>(`${this.apiUrl}/${id}`, data, { headers });
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

  registerPayment(id: string, paymentData: PaymentData): Observable<AccountReceivable> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<AccountReceivable>(`${this.apiUrl}/${id}/payments`, paymentData, { headers });
      })
    );
  }

  getPaymentHistory(id: string): Observable<any[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<any[]>(`${this.apiUrl}/${id}/payments`, { headers });
      })
    );
  }

  getByStatus(status: 'pending' | 'partial' | 'paid' | 'cancelled'): Observable<AccountReceivable[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountReceivable[]>(`${this.apiUrl}?status=${status}`, { headers });
      })
    );
  }

  getOverdue(): Observable<AccountReceivable[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<AccountReceivable[]>(`${this.apiUrl}/overdue`, { headers });
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
  /**
 * Enviar recordatorio de pago por email
 */
sendPaymentReminder(accountId: string, emailData: {
  recipientEmail: string;
  customMessage?: string;
}): Observable<{ jobId: string; logId: string; message: string }> {
  return this.getHeaders().pipe(
    switchMap((headers: HttpHeaders) => {
      return this.http.post<{ jobId: string; logId: string; message: string }>(
        `${this.apiUrl}/${accountId}/send-reminder`,
        emailData,
        { headers }
      );
    }),
    tap(response => console.log('✅ Recordatorio enviado:', response)),
    catchError(error => {
      console.error('❌ Error enviando recordatorio:', error);
      return throwError(() => error);
    })
  );
}

/**
 * Enviar recordatorios masivos a cuentas vencidas
 */
sendOverdueReminders(): Observable<{ sent: number; failed: number; results: any[] }> {
  return this.getHeaders().pipe(
    switchMap((headers: HttpHeaders) => {
      return this.http.post<{ sent: number; failed: number; results: any[] }>(
        `${this.apiUrl}/send-overdue-reminders`,
        {},
        { headers }
      );
    }),
    tap(response => console.log('✅ Recordatorios masivos enviados:', response)),
    catchError(error => {
      console.error('❌ Error enviando recordatorios masivos:', error);
      return throwError(() => error);
    })
  );
}
}