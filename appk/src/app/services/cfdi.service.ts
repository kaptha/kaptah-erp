import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CFDI } from '../models/cfdi.model';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class CFDIService {
  private apiUrl = `${environment.salesApiUrl}/api/cfdi`;
  private certVaultUrl = environment.certVaultUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * ✅ CORREGIDO: Obtiene headers con JWT convertido (no Firebase token directo)
   */
  private getHeaders(): Observable<HttpHeaders> {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      console.error('❌ No se encontró token de autenticación');
      throw new Error('No se encontró token de autenticación');
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

  /**
   * Headers para endpoints que necesitan Firebase token directo (como PDF)
   */
  private getFirebaseHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('❌ No se encontró token de autenticación');
      throw new Error('No se encontró token de autenticación');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Firebase-Token': token,
      'Content-Type': 'application/json'
    });
  }

  // ==========================================
  // MÉTODOS PARA CREAR CFDIs
  // ==========================================

  /**
   * Crea un CFDI de Ingreso
   */
  createIngresoCfdi(cfdiData: any): Observable<any> {
    console.log('📤 Enviando CFDI de Ingreso:', cfdiData);
    
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/ingreso`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.post(url, cfdiData, { headers });
      }),
      tap(response => console.log('✅ Respuesta del servidor:', response)),
      catchError(error => {
        console.error('❌ Error creando CFDI:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea un CFDI de Nómina
   */
  createCFDINomina(cfdiData: any): Observable<any> {
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/nomina`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.post(url, cfdiData, { headers });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Crea un CFDI de Pago
   */
  createCFDIPago(cfdiData: any): Observable<any> {
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/pago`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.post(url, cfdiData, { headers });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Descarga PDF del CFDI (usa Firebase token directo porque es @Public())
   */
  descargarPDF(cfdiId: string, estilo: string): Observable<Blob> {
    const headers = this.getFirebaseHeaders();
    
    console.log('📥 Solicitando PDF del CFDI:', cfdiId, 'con estilo:', estilo);
    
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    let pdfUrl = `${this.apiUrl}/${cfdiId}/pdf/${estilo}`;
    if (activeCuentaUid) {
      pdfUrl += `?cuentaUid=${activeCuentaUid}`;
    }
    return this.http.get(
      pdfUrl, 
      { 
        headers, 
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('❌ Error descargando PDF:', error);
        return throwError(() => error);
      })
    );
  }

  // ==========================================
  // MÉTODOS PARA LISTAR CFDIs
  // ==========================================

  /**
   * ✅ CORREGIDO: Obtiene todos los CFDIs del usuario con JWT
   */
  getCFDIs(): Observable<CFDI[]> {
    console.log('📥 Obteniendo lista de CFDIs...');
    
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/list`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.get<any[]>(url, { headers });
      }),
      map(cfdis => {
        console.log('✅ CFDIs recibidos:', cfdis);
        return cfdis.map(cfdi => this.transformCfdiFromBackend(cfdi));
      }),
      catchError(error => {
        console.error('❌ Error obteniendo CFDIs:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Transforma los datos de PostgreSQL al formato del frontend
   */
  private transformCfdiFromBackend(cfdi: any): CFDI {
    const xmlData = this.parseBasicXmlData(cfdi.xml);
    
    return {
      ID: cfdi.id,
      serie: xmlData.serie || 'A',
      folio: xmlData.folio || '0000',
      fecha: cfdi.createdAt,
      tipo: this.mapTipoFromCode(cfdi.tipo_cfdi),
      cliente: {
        nombre: xmlData.receptorNombre || 'Cliente',
        rfc: xmlData.receptorRfc || 'XAXX010101000'
      },
      subtotal: parseFloat(cfdi.subtotal) || 0,
      impuestos: (parseFloat(cfdi.total) - parseFloat(cfdi.subtotal)) || 0,
      total: parseFloat(cfdi.total) || 0,
      estado: cfdi.status === 'vigente' ? 'Vigente' : 'Cancelado',
      uuid: cfdi.uuid
    };
  }

  /**
   * Mapea el código de tipo de CFDI al nombre completo
   */
  private mapTipoFromCode(codigo: string): string {
    const tipos: { [key: string]: string } = {
      'I': 'Ingreso',
      'E': 'Egreso',
      'N': 'Nomina',
      'P': 'Pago'
    };
    return tipos[codigo] || 'Ingreso';
  }

  /**
   * Parsea datos básicos del XML
   */
  private parseBasicXmlData(xml: string): any {
    try {
      const serieMatch = xml.match(/Serie="([^"]+)"/);
      const serie = serieMatch ? serieMatch[1] : 'A';

      const folioMatch = xml.match(/Folio="([^"]+)"/);
      const folio = folioMatch ? folioMatch[1] : '0000';

      const receptorNombreMatch = xml.match(/Receptor[^>]+Nombre="([^"]+)"/);
      const receptorNombre = receptorNombreMatch ? receptorNombreMatch[1] : 'Cliente';

      const receptorRfcMatch = xml.match(/Receptor[^>]+Rfc="([^"]+)"/);
      const receptorRfc = receptorRfcMatch ? receptorRfcMatch[1] : 'XAXX010101000';

      return { serie, folio, receptorNombre, receptorRfc };
    } catch (error) {
      console.error('Error parseando XML:', error);
      return { serie: 'A', folio: '0000', receptorNombre: 'Cliente', receptorRfc: 'XAXX010101000' };
    }
  }

  /**
   * Obtiene un CFDI por ID
   */
  getCFDI(id: string): Observable<CFDI> {
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
      }),
      map(cfdi => this.transformCfdiFromBackend(cfdi)),
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un CFDI
   */
  deleteCFDI(id: string): Observable<any> {
    console.log('🗑️ Eliminando CFDI con ID:', id);
    
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/${id}`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.delete(url, { headers });
      }),
      catchError(error => {
        console.error('❌ Error en deleteCFDI:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza un CFDI
   */
  updateCFDI(id: string, cfdiData: any): Observable<any> {
    const activeCuentaUid = localStorage.getItem('activeCuentaUid');
    return this.getHeaders().pipe(
      switchMap((headers: HttpHeaders) => {
        let url = `${this.apiUrl}/${id}`;
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.put(url, cfdiData, { headers });
      }),
      catchError(this.handleError)
    );
  }
/**
 * Envía CFDI por email con PDF y XML adjuntos
 */
enviarPorEmail(cfdiId: string, clienteEmail: string, customMessage?: string, pdfStyle?: string): Observable<any> {
  console.log('📧 Enviando CFDI por email:', cfdiId, 'a:', clienteEmail, 'estilo:', pdfStyle);
  return this.getHeaders().pipe(
    switchMap((headers: HttpHeaders) => {
      let url = `${this.apiUrl}/${cfdiId}/enviar-email`;
        const activeCuentaUid = localStorage.getItem('activeCuentaUid');
        if (activeCuentaUid) {
          url += `?cuentaUid=${activeCuentaUid}`;
        }
        return this.http.post(url, {
        clienteEmail,
        customMessage: customMessage || '',
        pdfStyle: pdfStyle || 'classic',
      }, { headers });
    }),
    tap(response => console.log('✅ Email encolado:', response)),
    catchError(error => {
      console.error('❌ Error enviando CFDI por email:', error);
      return throwError(() => error);
    })
  );
}

  // ==========================================
  // MÉTODOS PARA CERTIFICADOS
  // ==========================================

  checkCertificate(): Observable<any> {
    const headers = this.getFirebaseHeaders();
    return this.http.get(`${this.certVaultUrl}/certificates/csd/check`, { headers })
      .pipe(catchError(this.handleError));
  }

  getCertificateInfo(): Observable<any> {
    const headers = this.getFirebaseHeaders();
    return this.http.get(`${this.certVaultUrl}/certificates/csd/check`, { headers })
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // MANEJO DE ERRORES
  // ==========================================

  private handleError(error: any) {
    console.error('Error en CFDIService:', error);
    
    let errorMessage = 'Ocurrió un error en el servidor';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      errorMessage = `Error ${error.status}: ${error.message}`;
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}


