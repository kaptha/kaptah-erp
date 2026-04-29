import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Product } from '../../pages/productos/interfaces/product.interface';
import { CreateProductDto } from '../../pages/productos/interfaces/create-product.dto';
import { UsersService } from '../users.service';
import { RefreshToken } from '../../config';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
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

  getProducts(): Observable<Product[]> {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return throwError(() => new Error('No se encontró el token de autenticación'));
    }
    const cuentaUid = this.getActiveCuentaUid();
    if (cuentaUid) {
      const headers = this.getHeaders();
      return this.http.get<Product[]>(`${this.apiUrl}/products/firebase/${cuentaUid}`, { headers }).pipe(
        tap(response => console.log('Productos recibidos:', response)),
        catchError(error => {
          console.error('Error al obtener productos:', error);
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
        return this.http.get<Product[]>(`${this.apiUrl}/products/firebase/${user.id}`, { headers });
      }),
      tap(response => console.log('Productos recibidos:', response)),
      catchError(error => {
        console.error('Error al obtener productos:', error);
        return throwError(() => error);
      })
    );
  }

  createProduct(productData: CreateProductDto): Observable<Product> {
    console.log('Intentando crear producto con datos:', productData);
    const refreshToken = localStorage.getItem('firebaseRefreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }
    return this.http.post<any>(RefreshToken.url, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).pipe(
      switchMap(response => {
        const freshToken = response.id_token;
        localStorage.setItem('idToken', freshToken);
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + freshToken
        });
        const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
        return this.http.post<Product>(this.apiUrl + '/products?cuentaUid=' + cuentaUid, productData, { headers });
      }),
      tap(response => console.log('Respuesta del servidor:', response)),
      catchError(error => {
        console.error('Error en createProduct:', error);
        return throwError(() => error);
      })
    );
  }

  updateProduct(id: number, productData: Partial<Product>): Observable<Product> {
    const headers = this.getHeaders();
    console.log(`Actualizando producto ${id} con datos:`, productData);
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}?cuentaUid=${cuentaUid}`, productData, { headers }).pipe(
      tap(response => console.log('Producto actualizado:', response)),
      catchError(error => {
        console.error('Error al actualizar producto:', error);
        console.error('URL intentada:', `${this.apiUrl}/products/${id}`);
        console.error('Datos enviados:', productData);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualizar stock de un producto
   * Usa el endpoint específico PATCH /products/:id/stock
   */
 updateStock(id: number, quantity: number): Observable<Product> {
  const refreshToken = localStorage.getItem('firebaseRefreshToken');
  
  if (!refreshToken) {
    return throwError(() => new Error('No hay refresh token disponible'));
  }

  // Refrescar el idToken antes de llamar al inventory-api
  return this.http.post<any>(RefreshToken.url, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  }).pipe(
    switchMap(response => {
      const freshToken = response.id_token;
      // Guardar el token fresco
      localStorage.setItem('idToken', freshToken);
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      });

      return this.http.patch<Product>(
        `${this.apiUrl}/products/${id}/stock`,
        { quantity },
        { headers }
      );
    }),
    tap(response => console.log('✅ Stock actualizado:', response)),
    catchError(error => {
      console.error('❌ Error al actualizar stock:', error);
      return throwError(() => error);
    })
  );
}


  deleteProduct(id: number): Observable<void> {
    const headers = this.getHeaders();
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    return this.http.delete<void>(`${this.apiUrl}/products/${id}?cuentaUid=${cuentaUid}`, { headers }).pipe(
      tap(() => console.log(`Producto ${id} eliminado`)),
      catchError(error => {
        console.error('Error al eliminar producto:', error);
        return throwError(() => error);
      })
    );
  }
}
