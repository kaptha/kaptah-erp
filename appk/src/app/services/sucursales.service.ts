import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, of, from } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { UsersService } from './users.service';
import { Sucursal } from '../models/sucursal.model';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
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

  getSucursales(): Observable<Sucursal[]> {
    const cuentaUid = this.getActiveCuentaUid();
    const uid = cuentaUid || localStorage.getItem('firebaseUid');
    if (!uid) {
      return throwError(() => new Error('No se encontro el UID del usuario'));
    }
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.get<Sucursal[]>(`${this.apiUrl}/branches/firebase/${uid}`, { headers }).pipe(
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

  createSucursal(sucursalData: Omit<Sucursal, 'id'>): Observable<Sucursal> {
    const cuentaUid = this.getActiveCuentaUid();
    const { codigoPostal, ...rest } = sucursalData;
    const dataToSend = {
      ...rest,
      codigoPostal: Number(codigoPostal)
    };

    return this.getHeaders().pipe(
      switchMap(headers => {
        const url = cuentaUid
          ? `${this.apiUrl}/branches?cuentaUid=${cuentaUid}`
          : `${this.apiUrl}/branches`;
        return this.http.post<Sucursal>(url, dataToSend, { headers });
      }),
      tap(response => console.log('Sucursal creada:', response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error completo:', error);
        let errorMessage = 'Ocurrio un error al crear la sucursal';
        if (error.error?.message) {
          errorMessage = Array.isArray(error.error.message)
            ? error.error.message.join(', ')
            : error.error.message;
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteSucursal(id: number): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers =>
        this.http.delete(`${this.apiUrl}/branches/${id}`, { headers }).pipe(
          tap(response => console.log('Sucursal eliminada:', response)),
          catchError((error: HttpErrorResponse) => {
            let errorMessage = 'Error al eliminar la sucursal';
            if (error.error?.message) {
              errorMessage = Array.isArray(error.error.message)
                ? error.error.message.join(', ')
                : error.error.message;
            }
            return throwError(() => new Error(errorMessage));
          })
        )
      )
    );
  }
}
