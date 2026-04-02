import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { UsersService } from '../users.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = 'https://selfless-analysis-production.up.railway.app/api';

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}
private getActiveCuentaUid(): string | null {
    return localStorage.getItem('activeCuentaUid') || null;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getServices(): Observable<any[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    const cuentaUid = this.getActiveCuentaUid();
    if (cuentaUid) {
      const headers = this.getHeaders();
      return this.http.get<any[]>(`${this.apiUrl}/services/firebase/${cuentaUid}`, { headers }).pipe(
        tap(response => console.log('Servicios recibidos:', response)),
        catchError(error => {
          console.error('Error al obtener servicios:', error);
          return throwError(() => error);
        })
      );
    }
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontró el usuario');
        }
        console.log('userId:', user.id);
        const headers = this.getHeaders();
        return this.http.get<any[]>(`${this.apiUrl}/services/firebase/${user.id}`, { headers });
      }),
      tap(response => console.log('Servicios recibidos:', response)),
      catchError(error => {
        console.error('Error al obtener servicios:', error);
        return throwError(() => error);
      })
    );
  }

  createService(serviceData: any): Observable<any> {
    console.log('Intentando crear servicio con datos:', serviceData);
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/services`, serviceData, { headers }).pipe(
      tap(response => console.log('Respuesta del servidor:', response)),
      catchError(error => {
        console.error('Error en createService:', error);
        return throwError(() => error);
      })
    );
  }

  deleteService(id: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.apiUrl}/services/${id}`, { headers }).pipe(
      tap(() => console.log(`Servicio ${id} eliminado`)),
      catchError((error: any) => {
        console.error('Error al eliminar servicio:', error);
        return throwError(() => error);
      })
    );
  }
  
  updateService(id: number, serviceData: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put<any>(`${this.apiUrl}/services/${id}`, serviceData, { headers }).pipe(
      tap(response => console.log('Servicio actualizado:', response)),
      catchError(error => {
        console.error('Error al actualizar servicio:', error);
        return throwError(() => error);
      })
    );
  }
}
