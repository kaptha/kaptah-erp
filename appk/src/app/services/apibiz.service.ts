import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError, tap } from 'rxjs';
import { switchMap, catchError, retry, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Cliente } from '../models/cliente.model';
import { Empleado } from '../models/empleado.model';
import { Proveedor } from '../models/proveedor.model';
import { UsersService } from './users.service';

@Injectable({
  providedIn: 'root'
})
export class ApibizService {
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
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getClients(): Observable<Cliente[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontró el usuario');
        }
        console.log('userId:', user.id);
        const headers = this.getHeaders();
        return this.http.get<Cliente[]>(`${this.apiUrl}/clients/${user.id}`, { headers });
      }),
      catchError(this.handleError)
    );
  }

  createClient(clientData: Omit<Cliente, 'ID'>): Observable<Cliente> {
    const headers = this.getHeaders();
    console.log('Datos enviados al crear cliente:', JSON.stringify(clientData));
    return this.http.post<Cliente>(`${this.apiUrl}/clients`, clientData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateClient(id: number, clientData: Cliente): Observable<Cliente> {
    const headers = this.getHeaders();
    // Crear una copia del objeto clientData sin la propiedad ID
    const { ID, ...clientDataWithoutId } = clientData;
    return this.http.put<Cliente>(`${this.apiUrl}/clients/${id}`, clientDataWithoutId, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteClient(ID: number): Observable<any> {
    console.log(`Enviando solicitud para eliminar cliente con ID: ${ID}`);
    const token = localStorage.getItem('idToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete(`${this.apiUrl}/clients/${ID}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en la solicitud:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }
  
  // CRUD para Empleados
  getEmpleados(): Observable<Empleado[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontró el usuario');
        }
        console.log('userId:', user.id);
        const headers = this.getHeaders();
        return this.http.get<Empleado[]>(`${this.apiUrl}/employees/${user.id}`, { headers });
      }),
      catchError(this.handleError)
    );
  }

  createEmpleado(empleadoData: Omit<Empleado, 'id'>): Observable<Empleado> {
    const headers = this.getHeaders();
    console.log('Datos enviados al crear empleado:', JSON.stringify(empleadoData));
    return this.http.post<Empleado>(`${this.apiUrl}/employees`, empleadoData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateEmpleado(id: number, empleadoData: Empleado): Observable<Empleado> {
    const headers = this.getHeaders();
    // Crear una copia del objeto empleadoData sin la propiedad id
    const { id: empleadoId, ...empleadoDataWithoutId } = empleadoData;
    return this.http.put<Empleado>(`${this.apiUrl}/employees/${id}`, empleadoDataWithoutId, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteEmpleado(id: number): Observable<any> {
    console.log(`Enviando solicitud para eliminar empleado con ID: ${id}`);
    const token = localStorage.getItem('idToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete(`${this.apiUrl}/employees/${id}`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }
  
  // CRUD para Proveedores
  getProveedores(): Observable<Proveedor[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    
    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('No se encontró el usuario');
        }
        console.log('userId:', user.id);
        const headers = this.getHeaders();
        return this.http.get<Proveedor[]>(`${this.apiUrl}/suppliers/${user.id}`, { headers });
      }),
      catchError(this.handleError)
    );
  }

  createProveedor(proveedorData: any): Observable<Proveedor> {
    const headers = this.getHeaders();
    console.log('Datos enviados al crear proveedor:', JSON.stringify(proveedorData));
    return this.http.post<Proveedor>(`${this.apiUrl}/suppliers`, proveedorData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateProveedor(id: number, proveedorData: any): Observable<Proveedor> {
    const headers = this.getHeaders();
    // Eliminar campos que no deben enviarse en la actualización
    const { 
      ID, 
      userId, 
      fecha_registro, 
      Fecha_Registro,  // ← También eliminar la versión con mayúscula
      activo, 
      isEditing,
      estado_proveedor, // ← Este también puede causar problemas
      pais,
      ...cleanData 
    } = proveedorData;
    
    console.log('Datos enviados al actualizar proveedor:', JSON.stringify(cleanData));
    
    return this.http.put<Proveedor>(`${this.apiUrl}/suppliers/${id}`, cleanData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteProveedor(ID: number): Observable<any> {
    console.log(`Enviando solicitud para eliminar proveedor con ID: ${ID}`);
    const token = localStorage.getItem('idToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete(`${this.apiUrl}/suppliers/${ID}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }
  // Método para obtener términos y condiciones
getTerminosCondiciones(): Observable<{terminos: string}> {
  const idToken = localStorage.getItem('idToken');
  if (!idToken) {
    return throwError(() => new Error('No se encontró el token de autenticación'));
  }
  
  return this.usersService.getUserByToken(idToken).pipe(
    switchMap(user => {
      if (!user || !user.firebaseUid) {
        throw new Error('No se encontró el usuario o firebaseUid');
      }
      const headers = this.getHeaders();
      return this.http.get<{terminos: string}>(
        `${this.apiUrl}/users/terminos/${user.firebaseUid}`, 
        { headers }
      );
    }),
    catchError(this.handleError)
  );
}

// Método para actualizar términos y condiciones
updateTerminosCondiciones(terminos: string): Observable<any> {
  const idToken = localStorage.getItem('idToken');
  if (!idToken) {
    return throwError(() => new Error('No se encontró el token de autenticación'));
  }
  
  return this.usersService.getUserByToken(idToken).pipe(
    switchMap(user => {
      if (!user || !user.firebaseUid) {
        throw new Error('No se encontró el usuario o firebaseUid');
      }
      const headers = this.getHeaders();
      return this.http.put(
        `${this.apiUrl}/users/terminos/${user.firebaseUid}`, 
        { terminos }, 
        { headers }
      );
    }),
    catchError(this.handleError)
  );
}
}