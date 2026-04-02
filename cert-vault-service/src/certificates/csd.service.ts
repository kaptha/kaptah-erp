import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class CsdService {
  private apiUrl = 'https://reliable-harmony-production-ca69.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): Observable<HttpHeaders> {
    const user = getAuth().currentUser;
    if (!user) {
      return throwError(() => new Error('No authenticated user'));
    }
    // getIdToken(true) fuerza refresh si está expirado
    return from(user.getIdToken(true)).pipe(
      map(token => new HttpHeaders({
        'Authorization': `Bearer ${token}`
      }))
    );
  }

  getActiveCsd(): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.get(`${this.apiUrl}/certificates/csd/active`, { headers })
      )
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
  ): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers => {
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

        // Para FormData NO pongas Content-Type, el browser agrega el boundary
        const headersWithoutContentType = new HttpHeaders({
          'Authorization': headers.get('Authorization')!
        });

        return this.http.post(`${this.apiUrl}/certificates/csd`, formData, { 
          headers: headersWithoutContentType 
        });
      })
    );
  }

  verifyCsdStatus(csdId: string): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.get(`${this.apiUrl}/certificates/csd/${csdId}/status`, { headers })
      )
    );
  }
}