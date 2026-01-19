import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = 'http://localhost:4005/api';  // Ajusta según tu configuración

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
  getServices(): Observable<any[]> {
    const headers = this.getHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/services`, { headers }).pipe(
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