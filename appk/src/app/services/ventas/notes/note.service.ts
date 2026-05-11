import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { SaleNote } from '../../../models/sale-note.model';
import { AuthService } from '../../auth.service';
import { AuthResponse } from '../../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private apiUrl = 'https://extraordinary-beauty-production-78f6.up.railway.app/api/sale-notes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): Observable<HttpHeaders> {
    const idToken = localStorage.getItem('idToken');
    console.log('idToken:', idToken?.substring(0, 20));

    if (!idToken) {
      throw new Error('No token found');
    }

    return from(this.authService.convertToJWT(idToken)).pipe(
      map((response: AuthResponse) => {
        return new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.access_token}`,
          'X-Firebase-Token': idToken
        });
      })
    );
  }

  getAll(): Observable<SaleNote[]> {
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    const url = cuentaUid ? `${this.apiUrl}?cuentaUid=${cuentaUid}` : this.apiUrl;
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<SaleNote[]>(url, { headers });
      })
    );
  }

  create(note: Partial<SaleNote>): Observable<SaleNote> {
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    const url = cuentaUid ? `${this.apiUrl}?cuentaUid=${cuentaUid}` : this.apiUrl;
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<SaleNote>(url, note, { headers });
      })
    );
  }

  update(id: string, note: Partial<SaleNote>): Observable<SaleNote> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.patch<SaleNote>(`${this.apiUrl}/${id}`, note, { headers });
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
      })
    );
  }

  // NUEVO MÃ‰TODO: Descargar PDF con estilo desde el backend
  descargarPDF(noteId: string, estilo: string): Observable<Blob> {
    const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
    const cuentaParam = cuentaUid ? `?cuentaUid=${cuentaUid}` : '';
    const url = `${this.apiUrl}/${noteId}/pdf/${estilo}${cuentaParam}`;
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get(url, {
          headers: headers,
          responseType: 'blob'
        });
      })
    );
  }
 /**
 * Enviar nota de venta por email
 */
sendNoteByEmail(noteId: string, emailData: {
  recipientEmail: string;
  customMessage?: string;
  pdfStyle?: string;
}): Observable<any> {
  const cuentaUid = localStorage.getItem('activeCuentaUid') || '';
  const cuentaParam = cuentaUid ? `?cuentaUid=${cuentaUid}` : '';
  const url = `${this.apiUrl}/${noteId}/send-email${cuentaParam}`;
  
  // âœ… Obtener el idToken original de Firebase
  const idToken = localStorage.getItem('idToken');
  
  if (!idToken) {
    return throwError(() => new Error('No se encontrÃ³ token de autenticaciÃ³n'));
  }

  // âœ… Convertir a JWT para autenticaciÃ³n del guard
  return from(this.authService.convertToJWT(idToken)).pipe(
    switchMap((response: AuthResponse) => {
      // âœ… Enviar AMBOS tokens:
      // - accessToken para el JwtAuthGuard (autenticaciÃ³n)
      // - idToken original para obtener el logo (header custom)
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`, // Para el guard
        'X-Firebase-Token': idToken // Para obtener el logo
      });
      
      return this.http.post(url, emailData, { headers });
    })
  );
}
}

