import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RefreshToken } from '../config';

interface CsdResponse {
  id: string;
  userId: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  issuerName: string;
  issuerSerial: string;
  cerPem: string;
  keyPem: string;
  cerBase64: string;
  keyBase64: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsdService {
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

  getActiveCsd(): Observable<CsdResponse> {
    return this.getFreshToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<CsdResponse>(`${this.apiUrl}/certificates/csd/active`, { headers });
      })
    );
  }

  uploadCsd(
    cerFile: File,
    keyFile: File,
    password: string,
    certificateNumber: string,
    serialNumber: string,
    validFrom: string,
    validUntil: string,
    issuerName: string,
    issuerSerial: string
  ): Observable<CsdResponse> {
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

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        return this.http.post<CsdResponse>(
          `${this.apiUrl}/certificates/csd`,
          formData,
          { headers }
        );
      })
    );
  }

  verifyCsdStatus(csdId: string): Observable<any> {
    return this.getFreshToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get(`${this.apiUrl}/certificates/csd/${csdId}/status`, { headers });
      })
    );
  }
}