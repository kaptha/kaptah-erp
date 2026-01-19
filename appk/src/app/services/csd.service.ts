import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UsersService } from './users.service';
import { switchMap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

// Interface para la respuesta del CSD
interface CsdResponse {
  id: string;
  userId: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  issuerName: string;
  issuerSerial: string;
  // Campos específicos de CSD
  cerPem: string;
  keyPem: string;
  cerBase64: string;
  keyBase64: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsdService {
  private apiUrl = 'http://localhost:3004/api';

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
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getActiveCsd(): Observable<CsdResponse> {
    const headers = this.getHeaders();
    return this.http.get<CsdResponse>(`${this.apiUrl}/certificates/csd/active`, { headers });
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

        console.log('Datos enviados para CSD:', {
          validFrom: validFromString,
          validUntil: validUntilString,
          certificateNumber,
          serialNumber
        });

        const headers = this.getHeaders();
        return this.http.post<CsdResponse>(
          `${this.apiUrl}/certificates/csd`, 
          formData, 
          { headers }
        );
      })
    );
  }
 
private handleError(error: any) {
  console.error('Error en CsdService:', error);
  
  let errorMessage = 'Ocurrió un error en el servidor';
  
  if (error.error instanceof ErrorEvent) {
    // Error del cliente
    errorMessage = `Error: ${error.error.message}`;
  } else if (error.status) {
    // Error del servidor con código de estado
    errorMessage = `Error ${error.status}: ${error.message}`;
    
    // Si hay un mensaje específico del API
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    }
  }
  
  return throwError(() => new Error(errorMessage));
}

  // Método opcional para verificar el estado de un CSD
  verifyCsdStatus(csdId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(
      `${this.apiUrl}/certificates/csd/${csdId}/status`, 
      { headers }
    );
  }
}