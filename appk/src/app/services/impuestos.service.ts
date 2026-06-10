import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { UsersService } from './users.service';

interface Impuesto {
  id?: number;
  alias: string;
  uso: string;
  tipo_impuesto: string;
  impuesto: string;
  tasa: number;
  valor_cuota: string;
  userId: number;
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

  private getActiveCuentaUid(): string | null {
    return localStorage.getItem('activeCuentaUid') || null;
  }

  private getFreshToken(): Observable<string> {
    const refreshToken = localStorage.getItem('firebaseRefreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No se encontro token de autenticacion'));
    }
    return this.http.post<any>(
      'https://securetoken.googleapis.com/v1/token?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA',
      { grant_type: 'refresh_token', refresh_token: refreshToken }
    ).pipe(
      map(res => {
        const newToken = res.id_token;
        localStorage.setItem('idToken', newToken);
        return newToken;
      }),
      catchError(() => {
        const token = localStorage.getItem('idToken');
        if (token) return of(token);
        return throwError(() => new Error('No se pudo obtener token'));
      })
    );
  }

  private getHeaders(): Observable<HttpHeaders> {
    return this.getFreshToken().pipe(
      map(token => new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }))
    );
  }

  getImpuestos(): Observable<Impuesto[]> {
    const cuentaUid = this.getActiveCuentaUid();
    const uid = cuentaUid || localStorage.getItem('firebaseUid');
    if (!uid) {
      return throwError(() => new Error('No se encontro el UID del usuario'));
    }
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.get<Impuesto[]>(`${this.apiUrl}/taxes/firebase/${uid}`, { headers }).pipe(
          catchError((error: any) => {
            if (error?.status === 404 || error?.error?.statusCode === 404) {
              return of([]);
            }
            return throwError(() => new Error(error.error?.message || 'Error desconocido'));
          })
        )
      )
    );
  }

  createImpuesto(impuestoData: any): Observable<any> {
    const cuentaUid = this.getActiveCuentaUid();
    return this.getHeaders().pipe(
      switchMap(headers => {
        const url = cuentaUid
          ? `${this.apiUrl}/taxes?cuentaUid=${cuentaUid}`
          : `${this.apiUrl}/taxes`;
        return this.http.post<any>(url, impuestoData, { headers });
      }),
      tap(response => console.log('Impuesto creado:', response)),
      catchError(error => {
        console.error('Error en la peticion:', error);
        return throwError(() => error);
      })
    );
  }

  deleteImpuesto(id: number): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.delete(`${this.apiUrl}/taxes/${id}`, { headers }).pipe(
          catchError((error: any) => {
            if (error?.status === 404 || error?.error?.statusCode === 404) {
              return of([]);
            }
            return throwError(() => new Error(error.error?.message || 'Error desconocido'));
          })
        )
      )
    );
  }
}
