import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface CheckoutResponse {
  sessionId: string;
  url: string;
  plan: string;
  cicloFacturacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private apiUrl = 'https://kaptah-erp-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No se encontro token de autenticacion');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createCheckout(data: {
    plan: string;
    cicloFacturacion: string;
    firebaseUid: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }): Observable<CheckoutResponse> {
    const headers = this.getHeaders();
    return this.http.post<CheckoutResponse>(
      `${this.apiUrl}/payments/create-checkout`,
      data,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Error al crear checkout:', error);
        return throwError(() => error);
      })
    );
  }
}
