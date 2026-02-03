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

// âœ… DTO CORREGIDO para coincidir con el backend
export interface CreateAccountReceivableDto {
  // Campos requeridos que coinciden con el backend
  customerId: number;           // âœ… CAMBIO: De string a number
  customerName: string;         // âœ… AGREGADO: Campo requerido
  customerRfc: string;          // âœ… AGREGADO: Campo requerido
  totalAmount: number;
  creditDays: number;
  dueDate: string;              // Formato ISO: YYYY-MM-DD
  concept: string;              // âœ… AGREGADO: Campo requerido
  
  // Campos opcionales
  partnerId?: number;           // âœ… AGREGADO: Campo opcional
  issueDate?: string;           // âœ… AGREGADO: Campo opcional
  documentId?: string;
  documentNumber?: string;      // âœ… AGREGADO: Campo opcional
  documentType?: string;        // âœ… AGREGADO: Campo opcional
  documentReference?: string;   // âœ… AGREGADO: Campo opcional
  notes?: string;               // âœ… AGREGADO: Campo opcional
}

export interface UpdateAccountReceivableDto {
  customerId?: number;          // âœ… CAMBIO: De string a number
  customerName?: string;        // âœ… AGREGADO
  customerRfc?: string;         // âœ… AGREGADO
  totalAmount?: number;
  creditDays?: number;
  creditRemainingDays?: number; // âœ… AGREGADO
  dueDate?: string;
  issueDate?: string;           // âœ… AGREGADO
  concept?: string;             // âœ… AGREGADO
  documentId?: string;
  documentNumber?: string;      // âœ… AGREGADO
  documentType?: string;        // âœ… AGREGADO
  documentReference?: string;   // âœ… AGREGADO
  notes?: string;               // âœ… AGREGADO
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
  private apiUrl = 'https://imaginative-flexibility-production-c3f2.up.railway.app/accounts-receivable';

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
    // âœ… VALIDACIÃ“N CORREGIDA: Validar correctamente los campos
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

  // ... resto de los mÃ©todos permanecen igual
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
    tap(response => console.log('âœ… Recordatorio enviado:', response)),
    catchError(error => {
      console.error('âŒ Error enviando recordatorio:', error);
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
    tap(response => console.log('âœ… Recordatorios masivos enviados:', response)),
    catchError(error => {
      console.error('âŒ Error enviando recordatorios masivos:', error);
      return throwError(() => error);
    })
  );
}
}
