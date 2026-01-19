import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UsersService } from './users.service';
import { switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
interface FielResponse {
  id: string;
  userId: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  issuerName: string;
  issuerSerial: string;
}
@Injectable({
  providedIn: 'root'
})
export class FielService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('No se encontró token de autenticación');
      throw new Error('No se encontró token de autenticación');
    }
    // Quitar el Content-Type para FormData
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getActiveFiel(): Observable<any> {
  const headers = this.getHeaders();
  return this.http.get(`${this.apiUrl}/certificates/fiel/active`, { headers });
}

  uploadFiel(
  cerFile: File,
  keyFile: File,
  password: string,
  certificateNumber: string,
  serialNumber: string,
  validFrom: string,
  validUntil: string,
  issuerName: string,
  issuerSerial: string
) {
  return this.usersService.getUserByToken(localStorage.getItem('idToken') || '').pipe(
    switchMap(user => {
      const formData = new FormData();
      
      // Convertir las fechas a strings simples
      const validFromString = validFrom.replace('T', ' ').split('.')[0];
      const validUntilString = validUntil.replace('T', ' ').split('.')[0];

      formData.append('cer', cerFile);
      formData.append('key', keyFile);
      formData.append('password', password);
      formData.append('userId', user.id);
      formData.append('certificateNumber', certificateNumber);
      formData.append('serialNumber', serialNumber);
      formData.append('validFrom', validFromString);
      formData.append('validUntil', validUntilString);
      formData.append('issuerName', issuerName);
      formData.append('issuerSerial', issuerSerial);

      console.log('Fechas enviadas en FormData:', {
        validFrom: validFromString,
        validUntil: validUntilString
      });

      const headers = this.getHeaders();
      return this.http.post(`${this.apiUrl}/certificates/fiel`, formData, { headers });
    })
  );
}
}