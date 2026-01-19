import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { DeliveryNote } from '../../../models/delivery.model';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../auth.service';
import { AuthResponse } from '../../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private apiUrl = 'http://localhost:4000/delivery-notes';

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

  getAll(): Observable<DeliveryNote[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<DeliveryNote[]>(this.apiUrl, { headers });
      })
    );
  }

  create(delivery: Partial<DeliveryNote>): Observable<DeliveryNote> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        console.log('🚀 Enviando POST a:', this.apiUrl);
        console.log('📦 Payload:', delivery);
        return this.http.post<DeliveryNote>(this.apiUrl, delivery, { headers });
      })
    );
  }

  update(id: string, delivery: Partial<DeliveryNote>): Observable<DeliveryNote> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        // ✅ CAMBIADO: Usar PUT en vez de PATCH
        return this.http.put<DeliveryNote>(`${this.apiUrl}/${id}`, delivery, { headers });
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        // ✅ CORREGIDO: Usar paréntesis en vez de backticks
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
      })
    );
  }

  /**
   * Descargar PDF de guía de remisión desde el backend
   */
  descargarPDF(deliveryNoteId: string): Observable<Blob> {
    const url = `${this.apiUrl}/${deliveryNoteId}/pdf`;
    
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get(url, { 
          headers: headers,
          responseType: 'blob' 
        });
      })
    );
  }

  /**
   * Enviar guía de remisión por email
   */
  sendDeliveryNoteByEmail(deliveryNoteId: string, emailData: {
    recipientEmail: string;
    customMessage?: string;
  }): Observable<{ jobId: string; logId: string; message: string }> {
    const url = `${this.apiUrl}/${deliveryNoteId}/send-email`;
    
    // Obtener el idToken original de Firebase
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      return throwError(() => new Error('No se encontró token de autenticación'));
    }

    // Convertir a JWT para autenticación del guard
    return from(this.authService.convertToJWT(idToken)).pipe(
      switchMap((response: AuthResponse) => {
        // Enviar AMBOS tokens:
        // - accessToken para el JwtAuthGuard (autenticación)
        // - idToken original para obtener el logo (header custom)
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.access_token}`,
          'X-Firebase-Token': idToken
        });
        
        return this.http.post<{ jobId: string; logId: string; message: string }>(
          url,
          emailData,
          { headers }
        );
      })
    );
  }
}
