import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
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

  getImpuestos(): Observable<Impuesto[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
    switchMap(user => {
      if (!user) {
        throw new Error('No se encontró el usuario');
      }
      console.log('Haciendo petición para userId:', user.id); // Agrega este log
      const headers = this.getHeaders();
      return this.http.get<Impuesto[]>(`${this.apiUrl}/taxes/${user.id}`, { headers });
    }),
    tap(response => console.log('Respuesta del servidor:', response)), // Agrega este log
    catchError(this.handleError)
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
        console.error('Error en la petición:', error);
        return throwError(() => error);
      })
    );
}

  deleteImpuesto(id: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiUrl}/taxes/${id}`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    console.error('Error en la solicitud:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }
}