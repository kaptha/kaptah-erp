import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RefreshToken } from '../config';

/** Metadatos que devuelve cert-vault (nunca incluye llave ni contraseña) */
export interface FielResponse {
  id: string;
  userId: string;
  rfc: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  status: string;
  descargaMasivaAutorizada: boolean;
  lastUsedAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FielService {
  private apiUrl = 'https://reliable-harmony-production-ca69.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getFreshToken(): Observable<string> {
    const refreshToken = localStorage.getItem('firebaseRefreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }
    return this.http.post<any>(RefreshToken.url, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).pipe(
      switchMap(response => {
        const freshToken = response.id_token;
        localStorage.setItem('idToken', freshToken);
        return [freshToken];
      })
    );
  }

  private cuentaUid(): string {
    return localStorage.getItem('activeCuentaUid') || '';
  }

  getActiveFiel(): Observable<FielResponse> {
    return this.getFreshToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.get<FielResponse>(`${this.apiUrl}/certificates/fiel/active?cuentaUid=${this.cuentaUid()}`, { headers });
      })
    );
  }

  /**
   * @param autorizarDescargaMasiva consentimiento explícito: cert-vault guarda la contraseña
   *        cifrada para descargar CFDI del SAT sin intervención del usuario
   */
  uploadFiel(
    cerFile: File,
    keyFile: File,
    password: string,
    certificateNumber: string,
    serialNumber: string,
    validFrom: string,
    validUntil: string,
    issuerName: string,
    issuerSerial: string,
    autorizarDescargaMasiva: boolean = false
  ): Observable<FielResponse> {
    return this.getFreshToken().pipe(
      switchMap(token => {
        const formData = new FormData();
        formData.append('cer', cerFile);
        formData.append('key', keyFile);
        formData.append('password', password);
        formData.append('certificateNumber', certificateNumber);
        formData.append('serialNumber', serialNumber);
        formData.append('validFrom', validFrom.replace('T', ' ').split('.')[0]);
        formData.append('validUntil', validUntil.replace('T', ' ').split('.')[0]);
        formData.append('issuerName', issuerName);
        formData.append('issuerSerial', issuerSerial);
        formData.append('autorizarDescargaMasiva', autorizarDescargaMasiva ? 'true' : 'false');

        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.post<FielResponse>(`${this.apiUrl}/certificates/fiel?cuentaUid=${this.cuentaUid()}`, formData, { headers });
      })
    );
  }

  /** Revoca el consentimiento de descarga masiva (borra la contraseña cifrada en cert-vault) */
  revokeDescargaMasiva(): Observable<{ descargaMasivaAutorizada: boolean }> {
    return this.getFreshToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.delete<{ descargaMasivaAutorizada: boolean }>(
          `${this.apiUrl}/certificates/fiel/descarga-masiva?cuentaUid=${this.cuentaUid()}`,
          { headers }
        );
      })
    );
  }
}
