import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Product } from '../../pages/productos/interfaces/product.interface';
import { CreateProductDto } from '../../pages/productos/interfaces/create-product.dto';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:4005/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getProducts(): Observable<Product[]> {
    const headers = this.getHeaders();
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { headers }).pipe(
      tap(response => console.log('Productos recibidos:', response)),
      catchError(error => {
        console.error('Error al obtener productos:', error);
        return throwError(() => error);
      })
    );
  }

  createProduct(productData: CreateProductDto): Observable<Product> {
    console.log('Intentando crear producto con datos:', productData);
    const headers = this.getHeaders();
    return this.http.post<Product>(`${this.apiUrl}/products`, productData, { headers }).pipe(
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
    
    // Cambiar de PUT a PATCH
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}`, productData, { headers }).pipe(
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
    const headers = this.getHeaders();
    console.log(`Actualizando stock del producto ${id} con cantidad:`, quantity);
    
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}/stock`, { quantity }, { headers }).pipe(
      tap(response => console.log('Stock actualizado:', response)),
      catchError(error => {
        console.error('Error al actualizar stock:', error);
        console.error('URL intentada:', `${this.apiUrl}/products/${id}/stock`);
        console.error('Cantidad enviada:', quantity);
        return throwError(() => error);
      })
    );
  }

  deleteProduct(id: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`, { headers }).pipe(
      tap(() => console.log(`Producto ${id} eliminado`)),
      catchError(error => {
        console.error('Error al eliminar producto:', error);
        return throwError(() => error);
      })
    );
  }
}