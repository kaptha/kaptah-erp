import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { UsersService } from './users.service';

// Interfaz para el modelo de Impuesto
interface Impuesto {
  id?: number;
  alias: string;
  uso: string;
  tipo_impuesto: string;
  impuesto: string;
  tasa: number;
  valor_cuota: string;  
  userId: number; // Si necesitas asociarlo al usuario como en clientes
}

@Injectable({
  providedIn: 'root'
})
export class ImpuestosService {
  private apiUrl = 'https://kaptah-erp-production.up.railway.app/api';

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No se encontrÃ³ token de autenticaciÃ³n');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getImpuestos(): Observable<Impuesto[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontrÃ³ el token de autenticaciÃ³n'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
    switchMap(user => {
      if (!user) {
        throw new Error('No se encontrÃ³ el usuario');
      }
      console.log('Haciendo peticiÃ³n para userId:', user.id); // Agrega este log
      const headers = this.getHeaders();
      return this.http.get<Impuesto[]>(`${this.apiUrl}/taxes/firebase/${user.firebaseUid}`, { headers });
    }),
    tap(response => console.log('Respuesta del servidor:', response)), // Agrega este log
    catchError((error: any) => {
        if (error?.status === 404 || error?.error?.statusCode === 404) {
          return of([]);
        }
        return throwError(() => new Error(error.error?.message || 'Error desconocido'));
      })
    );
  }

  // impuestos.service.ts
createImpuesto(impuestoData: any): Observable<any> {
  const headers = this.getHeaders();
  console.log('Enviando datos:', impuestoData); // Debug
  return this.http.post<any>(`${this.apiUrl}/taxes`, impuestoData, { headers })
    .pipe(
      tap(response => console.log('Respuesta del servidor:', response)),
      catchError(error => {
        console.error('Error en la peticiÃ³n:', error);
        return throwError(() => error);
      })
    );
}

  deleteImpuesto(id: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiUrl}/taxes/${id}`, { headers })
      .pipe(
        catchError((error: any) => {
        if (error?.status === 404 || error?.error?.statusCode === 404) {
          return of([]);
        }
        return throwError(() => new Error(error.error?.message || 'Error desconocido'));
      })
    );
  }

  private handleError(error: any) {
    console.error('Error en la solicitud:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }
}

