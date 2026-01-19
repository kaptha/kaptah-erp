import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private apiUrl = 'http://localhost:3000/api/logos';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los encabezados con el token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('No se encontró token de autenticación');
      throw new Error('No se encontró token de autenticación');
    }
    // Quitamos el Content-Type para permitir que FormData lo establezca automáticamente
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Sube el logo del usuario
   * @param file Archivo de imagen (PNG, JPG, SVG)
   * @returns Observable con la respuesta
   */
  uploadLogo(file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('logo', file);

    const headers = this.getHeaders();
    
    const req = new HttpRequest('POST', this.apiUrl, formData, {
      headers: headers,
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req).pipe(
    timeout(60000) // 60 segundos
  );
  }

  /**
   * Obtiene el logo actual del usuario
   * @returns Observable con los datos del logo
   */
  getLogo(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/current`, { headers });
  }

  /**
   * Elimina el logo actual
   * @returns Observable con la respuesta
   */
  deleteLogo(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiUrl}/current`, { headers });
  }
}