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
  private apiUrl = 'http://localhost:4000/sale-notes';

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
          'Authorization': `Bearer ${response.access_token}`
        });
      })
    );
  }

  getAll(): Observable<SaleNote[]> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<SaleNote[]>(this.apiUrl, { headers });
      })
    );
  }

  create(note: Partial<SaleNote>): Observable<SaleNote> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.post<SaleNote>(this.apiUrl, note, { headers });
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

  // NUEVO MÉTODO: Descargar PDF con estilo desde el backend
  descargarPDF(noteId: string, estilo: string): Observable<Blob> {
    const url = `${this.apiUrl}/${noteId}/pdf/${estilo}`;
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
  const url = `${this.apiUrl}/${noteId}/send-email`;
  
  // ✅ Obtener el idToken original de Firebase
  const idToken = localStorage.getItem('idToken');
  
  if (!idToken) {
    return throwError(() => new Error('No se encontró token de autenticación'));
  }

  // ✅ Convertir a JWT para autenticación del guard
  return from(this.authService.convertToJWT(idToken)).pipe(
    switchMap((response: AuthResponse) => {
      // ✅ Enviar AMBOS tokens:
      // - accessToken para el JwtAuthGuard (autenticación)
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
