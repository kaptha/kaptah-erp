import { Observable, switchMap, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UsersService } from '../users.service';

export interface Category {
  id?: number;
  name: string;
  tipo: 'producto' | 'servicio';
  description?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'https://selfless-analysis-production.up.railway.app/api/categories'; 

  constructor(private http: HttpClient, private usersService: UsersService) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Obtener todas las categorías
  getCategories(): Observable<Category[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No token found'));
    }

    const cuentaUid = localStorage.getItem('activeCuentaUid');
    if (cuentaUid) {
      const headers = this.getHeaders();
      return this.http.get<Category[]>(`${this.apiUrl}/firebase/${cuentaUid}`, { headers }).pipe(
        tap(categories => console.log('Categorias recibidas:', categories)),
        catchError(error => {
          console.error('Error al obtener categorias:', error);
          return throwError(() => error);
        })
      );
    }

    return this.usersService.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('User not found');
        }
        const headers = this.getHeaders();
        return this.http.get<Category[]>(`${this.apiUrl}/firebase/${user.id}`, { headers }).pipe(
          tap(categories => console.log('Categorias recibidas:', categories))
        );
      }),
      catchError(error => {
        console.error('Error completo:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener una categoría por ID
  getCategory(id: number): Observable<Category> {
    const headers = this.getHeaders();
    return this.http.get<Category>(`${this.apiUrl}/${id}`, { headers });
  }

  // Crear una nueva categoría
  createCategory(category: Omit<Category, 'id'>): Observable<Category> {
    const headers = this.getHeaders(); 
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    return this.http.post<Category>(`${this.apiUrl}?cuentaUid=${cuentaUid}`, category, { headers });
  }

  // Actualizar una categoría
  updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    const headers = this.getHeaders();
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    return this.http.put<Category>(`${this.apiUrl}/${id}?cuentaUid=${cuentaUid}`, category, { headers });
  }

  // Eliminar una categoría
  deleteCategory(id: number): Observable<void> {
    const headers = this.getHeaders();
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    return this.http.delete<void>(`${this.apiUrl}/${id}?cuentaUid=${cuentaUid}`, { headers });
  }

  // Editar un servicio
  updateService(id: number, serviceData: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put<any>(`${this.apiUrl}/services/${id}`, serviceData, { headers });
  }
}
