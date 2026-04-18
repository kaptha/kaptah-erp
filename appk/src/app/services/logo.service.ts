import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private apiUrl = 'https://kaptah-erp-production.up.railway.app/api/logos';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los encabezados con el token de autenticaciÃ³n
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('No se encontrÃ³ token de autenticaciÃ³n');
      throw new Error('No se encontrÃ³ token de autenticaciÃ³n');
    }
    // Quitamos el Content-Type para permitir que FormData lo establezca automÃ¡ticamente
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
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    const params = cuentaUid ? `?cuentaUid=${cuentaUid}` : '';
    return this.http.get(`${this.apiUrl}/current${params}`, { headers });
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

