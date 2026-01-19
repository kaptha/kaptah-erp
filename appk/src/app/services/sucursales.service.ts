import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { UsersService } from './users.service';
import { Sucursal } from '../models/sucursal.model';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      throw new Error('No se encontró token de autenticación');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getSucursales(): Observable<Sucursal[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontró el usuario');
        }
        const headers = this.getHeaders();
        return this.http.get<Sucursal[]>(`${this.apiUrl}/branches/${user.id}`, { headers });
      }),
      catchError(this.handleError)
    );
  }

  createSucursal(sucursalData: Omit<Sucursal, 'id'>): Observable<Sucursal> {
  const headers = this.getHeaders();
  
  // Quitamos la parte del userId ya que el backend lo obtiene del token
  const { codigoPostal, ...rest } = sucursalData;
  const dataToSend = {
    ...rest,
    codigoPostal: Number(codigoPostal) // Aseguramos que sea número
  };

  console.log('Datos a enviar:', dataToSend);
  
  return this.http.post<Sucursal>(
    `${this.apiUrl}/branches`, 
    dataToSend, 
    { headers }
  ).pipe(
    tap(response => console.log('Respuesta del servidor:', response)),
    catchError((error: HttpErrorResponse) => {
      console.error('Error completo:', error);
      let errorMessage = 'Ocurrió un error al crear la sucursal';
      
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
  const headers = this.getHeaders();
  return this.http.delete(`${this.apiUrl}/branches/${id}`, { headers })
    .pipe(
      tap(response => console.log('Sucursal eliminada:', response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al eliminar:', error);
        let errorMessage = 'Error al eliminar la sucursal';
        if (error.error?.message) {
          errorMessage = Array.isArray(error.error.message) 
            ? error.error.message.join(', ') 
            : error.error.message;
        }
        return throwError(() => new Error(errorMessage));
      })
    );
}

  private handleError(error: any) {
    console.error('Error en la solicitud:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }
}