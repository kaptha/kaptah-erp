import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UsersService } from '../../users.service';
import { SalesOrder } from '../../../models/sales-order.model';
import { AuthService } from '../../auth.service';
import { AuthResponse } from '../../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class SalesOrdersService {
  private apiUrl = 'http://localhost:4000/sales-orders';

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

    // Convertir a Promise y luego a Observable para mantener la cadena
    return from(this.authService.convertToJWT(idToken)).pipe(
      map((response: AuthResponse) => {
        return new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.access_token}`
        });
      })
    );
  }

  getAll(): Observable<SalesOrder[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<SalesOrder[]>(this.apiUrl, { headers });
      })
    );
  }

  create(order: Partial<SalesOrder>): Observable<SalesOrder> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<SalesOrder>(this.apiUrl, order, { headers });
      })
    );
  }

  update(id: string, order: Partial<SalesOrder>): Observable<SalesOrder> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.put<SalesOrder>(`${this.apiUrl}/${id}`, order, { headers });
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

  getById(id: string): Observable<SalesOrder> {
  return this.getHeaders().pipe(
    switchMap((headers: HttpHeaders) => {
      return this.http.get<SalesOrder>(`${this.apiUrl}/${id}`, { headers });
    })
  );
}
descargarPDF(orderId: string, estilo: string): Observable<Blob> {
  const url = `${this.apiUrl}/${orderId}/pdf/${estilo}`;
  
  // ⭐ CAMBIO: Usar 'idToken' en lugar de lo que sea que esté usando ahora
  const idToken = localStorage.getItem('idToken'); 
  
  if (!idToken) {
    return throwError(() => new Error('No se encontró token de autenticación'));
  }
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${idToken}` // ← Token de Firebase
  });
  
  return this.http.get(url, { 
    headers: headers,
    responseType: 'blob' 
  });
}
/**
 * Enviar orden de venta por email
 */
sendSaleOrderByEmail(orderId: string, emailData: {
  recipientEmail: string;
  customMessage?: string;
}): Observable<{ jobId: string; logId: string; message: string }> {
  return this.getHeaders().pipe(
    switchMap((headers: HttpHeaders) => {
      return this.http.post<{ jobId: string; logId: string; message: string }>(
        `${this.apiUrl}/${orderId}/send-email`,
        emailData,
        { headers }
      );
    }),
    tap(response => console.log('✅ Orden enviada por email:', response)),
    catchError(error => {
      console.error('❌ Error enviando orden:', error);
      return throwError(() => error);
    })
  );
}
}