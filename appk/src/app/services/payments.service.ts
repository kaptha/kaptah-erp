import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface CheckoutResponse {
  checkoutRequestId: string;
  orderId: string;
  amount: number;
  plan: string;
  cicloFacturacion: string;
}

declare global {
  interface Window {
    ConektaCheckoutComponents: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private apiUrl = 'https://kaptah-erp-production.up.railway.app/api';
  private conektaPublicKey = 'key_TlCURKQtFFrMw43DSq7UOOa';

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

  initConektaCheckout(
    checkoutRequestId: string,
    containerId: string,
    onSuccess: (order: any) => void,
    onError: (error: any) => void
  ): void {
    const config = {
      locale: 'es',
      publicKey: this.conektaPublicKey,
      targetIFrame: containerId,
      checkoutRequestId,
    };

    const options = {
      backgroundMode: 'lightMode',
      colorPrimary: '#7B1FA2',
      colorText: '#333333',
      colorLabel: '#555555',
      inputType: 'minimalMode',
    };

    const callbacks = {
      onGetInfoSuccess: (loadingTime: any) => {
        console.log('Conekta checkout cargado', loadingTime);
      },
      onFinalizePayment: (order: any) => {
        console.log('Pago exitoso:', order);
        onSuccess(order);
      },
      onErrorPayment: (error: any) => {
        console.error('Error en pago:', error);
        onError(error);
      },
    };

    window.ConektaCheckoutComponents.Integration({
      config,
      callbacks,
      options,
    });
  }
}
