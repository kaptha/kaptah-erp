// src/app/services/cfdi.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CFDI } from '../models/cfdi.model';

@Injectable({
  providedIn: 'root'
})
export class CFDIService {
  private apiUrl = `${environment.apiUrl}/cfdi`; // ⭐ Agregar /cfdi a la base
  private certVaultUrl = environment.certVaultUrl;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los headers con el token de Firebase
   */
  private getHeaders(): HttpHeaders {
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
    const headers = this.getHeaders();
    console.log('📤 Enviando CFDI de Ingreso:', cfdiData);
    
    return this.http.post(`${this.apiUrl}/ingreso`, cfdiData, { headers })
      .pipe(
        map(response => {
          console.log('✅ Respuesta del servidor:', response);
          return response;
        }),
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
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/nomina`, cfdiData, { headers })
      .pipe(catchError(this.handleError));
  }

  /**
   * Crea un CFDI de Pago
   */
  createCFDIPago(cfdiData: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/pago`, cfdiData, { headers })
      .pipe(catchError(this.handleError));
  }
  /**
 * ⭐ NUEVO: Descarga PDF del CFDI
 */
descargarPDF(cfdiId: string, estilo: string): Observable<Blob> {
  const headers = this.getHeaders();
  
  console.log('📥 Solicitando PDF del CFDI:', cfdiId, 'con estilo:', estilo);
  
  return this.http.get(
    `${this.apiUrl}/${cfdiId}/pdf/${estilo}`, 
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
   * ⭐ NUEVO: Obtiene todos los CFDIs del usuario desde la BD
   */
  getCFDIs(): Observable<CFDI[]> {
    const headers = this.getHeaders();
    console.log('📥 Obteniendo lista de CFDIs...');
    
    // ⭐ Endpoint que debes crear en el backend
    return this.http.get<any[]>(`${this.apiUrl}/list`, { headers })
      .pipe(
        map(cfdis => {
          console.log('✅ CFDIs recibidos:', cfdis);
          // ⭐ Transformar datos de PostgreSQL a formato del frontend
          return cfdis.map(cfdi => this.transformCfdiFromBackend(cfdi));
        }),
        catchError(error => {
          console.error('❌ Error obteniendo CFDIs:', error);
          // Retornar array vacío en caso de error
          return throwError(() => error);
        })
      );
  }

  /**
   * ⭐ Transforma los datos de PostgreSQL al formato del frontend
   */
  private transformCfdiFromBackend(cfdi: any): CFDI {
  const xmlData = this.parseBasicXmlData(cfdi.xml);
  
  return {
    ID: cfdi.id,  // ⭐ Ahora es string (UUID)
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
   * Parsea datos básicos del XML (sin usar librerías pesadas)
   */
  private parseBasicXmlData(xml: string): any {
    try {
      // Extraer Serie
      const serieMatch = xml.match(/Serie="([^"]+)"/);
      const serie = serieMatch ? serieMatch[1] : 'A';

      // Extraer Folio
      const folioMatch = xml.match(/Folio="([^"]+)"/);
      const folio = folioMatch ? folioMatch[1] : '0000';

      // Extraer Receptor Nombre
      const receptorNombreMatch = xml.match(/Receptor[^>]+Nombre="([^"]+)"/);
      const receptorNombre = receptorNombreMatch ? receptorNombreMatch[1] : 'Cliente';

      // Extraer Receptor RFC
      const receptorRfcMatch = xml.match(/Receptor[^>]+Rfc="([^"]+)"/);
      const receptorRfc = receptorRfcMatch ? receptorRfcMatch[1] : 'XAXX010101000';

      return {
        serie,
        folio,
        receptorNombre,
        receptorRfc
      };
    } catch (error) {
      console.error('Error parseando XML:', error);
      return {
        serie: 'A',
        folio: '0000',
        receptorNombre: 'Cliente',
        receptorRfc: 'XAXX010101000'
      };
    }
  }

  /**
   * Obtiene un CFDI por ID
   */
  getCFDI(id: string): Observable<CFDI> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers })
      .pipe(
        map(cfdi => this.transformCfdiFromBackend(cfdi)),
        catchError(this.handleError)
      );
  }

  /**
   * Elimina un CFDI
   */
  deleteCFDI(id: string): Observable<any> {
  const headers = this.getHeaders();
  
  console.log('🗑️ Eliminando CFDI con ID:', id);
  console.log('📥 URL:', `${this.apiUrl}/${id}`);
  
  return this.http.delete(`${this.apiUrl}/${id}`, { headers }).pipe(
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
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/${id}`, cfdiData, { headers })
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // MÉTODOS PARA CERTIFICADOS
  // ==========================================

  checkCertificate(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(`${this.certVaultUrl}/certificates/csd/check`, { headers })
      .pipe(catchError(this.handleError));
  }

  getCertificateInfo(): Observable<any> {
    const headers = this.getHeaders();
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