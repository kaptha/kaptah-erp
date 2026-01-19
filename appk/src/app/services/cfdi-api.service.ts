import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interfaz para los CFDIs recibidos desde PostgreSQL
export interface CfdiRecibido {
  id: number;
  rfc_receptor: string;
  rfc_emisor: string;
  nombre_emisor?: string;
  fecha_recepcion: string;
  usuario_id: string; // 🔹 Cambiado a string para coincidir con Firebase UID
  estado_procesamiento: string;
  xml_completo: string;
  folio?: string;
  serie?: string;
  total?: number;
  subtotal?: number;
  iva?: number;
  moneda?: string;
  tipo_comprobante?: string;
  uso_cfdi?: string;
  metodo_pago?: string;
  forma_pago?: string;
}

export interface EstadisticasFinancieras {
  success: boolean;
  estadisticas: {
    resumenGeneral: {
      total_documentos: number;
      total_general: number;
      total_iva_trasladado: number;
      total_iva_retenido: number;
      ingresos: number;
      egresos: number;
      nominas: number;
    };
    porTipoComprobante: Array<{
      tipo: string;
      cantidad: number;
      total: number;
    }>;
  };
}

export interface AnalisisPeriodo {
  success: boolean;
  analisis: {
    resumenPeriodo: {
      total_ingresos: number;
      total_egresos: number;
      total_iva_trasladado: number;
      total_iva_retenido: number;
      total_documentos: number;
    };
    topProveedores: Array<{
      rfc: string;
      nombre: string;
      cantidad_facturas: number;
      total_gastado: number;
    }>;
  };
}

export interface TopProveedoresResponse {
  success: boolean;
  topProveedores: Array<{
    rfc: string;
    nombre: string;
    cantidad_facturas: number;
    total_gastado: number;
  }>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    uid: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CfdiApiService {
  private baseUrl = 'http://localhost:3005/xml-financiero'; // Puerto del cfdi-receiver-api
  
  constructor(private http: HttpClient) {
    console.log('🔹 CfdiApiService inicializado con baseUrl:', this.baseUrl);
  }
  /**
   * Obtiene los headers con autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== MÉTODOS DE XMLs ====================

  /**
   * Importa estructura completa de XMLs
   */
  importarEstructuraCompleta(rutaBase: string): Observable<any> {
    console.log('📤 Importando estructura completa desde:', rutaBase);
    return this.http.post(
      `${this.baseUrl}/xml-import/estructura-completa`,
      { rutaBase }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene estadísticas de importación
   */
  getEstadisticasImportacion(): Observable<any> {
    console.log('📊 Obteniendo estadísticas de importación');
    return this.http.get(
      `${this.baseUrl}/xml-import/estadisticas`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reprocesa RFCs existentes
   */
  reprocesarRfcs(): Observable<any> {
    console.log('🔄 Reprocesando RFCs existentes');
    return this.http.post(
      `${this.baseUrl}/xml-import/reprocesar-rfcs`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== MÉTODOS DE DATOS FINANCIEROS ====================

  /**
   * Procesa todos los XMLs para extraer datos financieros
   */
  procesarTodosLosXmls(): Observable<any> {
    console.log('⚙️ Procesando todos los XMLs...');
    return this.http.post(
      `${this.baseUrl}/procesar-todos`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene estadísticas financieras generales
   */
  getEstadisticasFinancieras(): Observable<EstadisticasFinancieras> {
    console.log('📊 Obteniendo estadísticas financieras');
    return this.http.get<EstadisticasFinancieras>(
      `${this.baseUrl}/xml-financiero/estadisticas`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene análisis financiero por período
   */
  getAnalisisPorPeriodo(fechaInicio: string, fechaFin: string): Observable<AnalisisPeriodo> {
    console.log('📈 Obteniendo análisis de período:', fechaInicio, 'a', fechaFin);
    return this.http.get<AnalisisPeriodo>(
      `${this.baseUrl}/analisis-periodo`,
      {
        params: {
          fechaInicio,
          fechaFin
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene resumen de IVA por período
   */
  getResumenIva(fechaInicio: string, fechaFin: string): Observable<any> {
    console.log('💰 Obteniendo resumen de IVA:', fechaInicio, 'a', fechaFin);
    return this.http.get(
      `${this.baseUrl}/resumen-iva`,
      {
        params: {
          fechaInicio,
          fechaFin
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene top proveedores por período
   */
  getTopProveedores(fechaInicio: string, fechaFin: string, limite: number = 10): Observable<TopProveedoresResponse> {
    console.log('🏆 Obteniendo top proveedores:', limite);
    return this.http.get<TopProveedoresResponse>(
      `${this.baseUrl}/top-proveedores`,
      {
        params: {
          fechaInicio,
          fechaFin,
          limite: limite.toString()
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== AUTENTICACIÓN ====================

  /**
   * Login con Firebase token para obtener JWT
   * NOTA: Este método NO requiere autenticación previa
   */
  login(firebaseToken: string): Observable<AuthResponse> {
    console.log('🔐 Haciendo login en cfdi-receiver-api...');
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/login`,
      { firebaseToken }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Refresca el token de acceso
   * NOTA: Este método NO requiere autenticación previa
   */
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    console.log('🔄 Refrescando token en cfdi-receiver-api...');
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/refresh`,
      { refresh_token: refreshToken }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== MÉTODOS DE CFDIs ====================

  /**
   * Obtiene CFDIs por ID de usuario
   */
  getCfdisByUserId(userId: string): Observable<CfdiRecibido[]> {
    console.log('📄 Obteniendo CFDIs para usuario:', userId);
    return this.http.get<CfdiRecibido[]>(
      `${this.baseUrl}/cfdis/user/${userId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene CFDIs filtrados por RFC del emisor (proveedor)
   */
  getCfdisByProviderRfc(userId: string, providerRfc: string): Observable<CfdiRecibido[]> {
    console.log('📄 Obteniendo CFDIs del proveedor:', providerRfc);
    return this.http.get<CfdiRecibido[]>(
      `${this.baseUrl}/cfdis/user/${userId}/provider/${providerRfc}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene CFDIs pendientes de procesar
   */
  getPendingCfdis(userId: string): Observable<CfdiRecibido[]> {
    console.log('⏳ Obteniendo CFDIs pendientes para usuario:', userId);
    return this.http.get<CfdiRecibido[]>(
      `${this.baseUrl}/cfdis/user/${userId}/pending`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== ANÁLISIS DE INGRESOS Y EGRESOS ====================

  /**
   * Obtiene análisis completo de ingresos
   */
  getAnalisisCompletoIngresos(fechaInicio: string, fechaFin: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();
    console.log('📊 Obteniendo análisis completo de ingresos');
    
    return this.http.get(`${this.baseUrl}/ingresos/analisis-completo`, {
      params: { rfcUsuario: userRfc, fechaInicio, fechaFin },
      headers: this.getHeaders()
    });
  }

  /**
   * Obtiene análisis completo de egresos
   */
  getAnalisisCompletoEgresos(fechaInicio: string, fechaFin: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();
    console.log('📊 Obteniendo análisis completo de egresos');
    
    return this.http.get(`${this.baseUrl}/egresos/analisis-completo`, {
      params: { rfcUsuario: userRfc, fechaInicio, fechaFin },
      headers: this.getHeaders()
    });
  }

  /**
   * Búsqueda simple de egresos (por query string)
   */
  buscarCfdisEgresos(query: string): Observable<any> {
    console.log('🔍 buscarCfdisEgresos - Query:', query);
    
    return this.busquedaRapidaEgresos({
      query: query,
      offset: 0,
      limit: 50
    });
  }

  /**
   * Búsqueda avanzada de egresos
   */
  busquedaAvanzadaEgresos(filtros: any): Observable<any> {
    console.log('🔍 ===== BÚSQUEDA AVANZADA DE EGRESOS =====');
    console.log('🔍 Filtros recibidos:', filtros);
    
    // ✅ Construir el query string combinando TODOS los campos de búsqueda
    const queryParts: string[] = [];
    
    if (filtros.rfc) queryParts.push(filtros.rfc);
    if (filtros.nombre) queryParts.push(filtros.nombre);
    if (filtros.uuid) queryParts.push(filtros.uuid);
    if (filtros.folio) queryParts.push(filtros.folio);
    if (filtros.serie) queryParts.push(filtros.serie);
    
    // Unir todos los términos de búsqueda con espacio
    const query = queryParts.join(' ').trim();
    
    console.log('🔍 Query construido:', query);
    console.log('🔍 Query length:', query.length);
    
    // ✅ Si no hay query Y no hay filtros de fecha/monto, retornar vacío
    if (!query && !filtros.fechaInicio && !filtros.fechaFin && 
        filtros.montoMin === null && filtros.montoMax === null) {
      console.warn('⚠️ Búsqueda avanzada sin filtros, retornando vacío');
      return new Observable(observer => {
        observer.next({ cfdis: [], total: 0 });
        observer.complete();
      });
    }
    
    // ✅ Construir parámetros para busquedaRapidaEgresos
    const params: any = {
      query: query || '',
      offset: 0,
      limit: 100
    };
    
    // Filtros adicionales
    if (filtros.fechaInicio) {
      params.fechaInicio = filtros.fechaInicio;
      console.log('✅ FechaInicio agregada:', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      params.fechaFin = filtros.fechaFin;
      console.log('✅ FechaFin agregada:', filtros.fechaFin);
    }
    if (filtros.montoMin !== null && filtros.montoMin !== undefined) {
      params.montoMin = filtros.montoMin;
      console.log('✅ MontoMin agregado:', filtros.montoMin);
    }
    if (filtros.montoMax !== null && filtros.montoMax !== undefined) {
      params.montoMax = filtros.montoMax;
      console.log('✅ MontoMax agregado:', filtros.montoMax);
    }
    
    console.log('🔍 Parámetros finales:', params);
    
    return this.busquedaRapidaEgresos(params);
  }

  // ====== MÉTODOS DE BÚSQUEDA AVANZADA PARA INGRESOS ======

  /**
   * Búsqueda rápida de CFDIs de ingresos (autocomplete)
   * @param query - Término de búsqueda
   */
  buscarCfdisIngresos(query: string): Observable<any> {
    console.log('🔍 ===== BÚSQUEDA DE INGRESOS =====');
    console.log('🔍 Query recibido:', query);
    console.log('🔍 Query tipo:', typeof query);
    console.log('🔍 Query length:', query?.length);
    console.log('🔍 Query trimmed:', query?.trim());
    
    // ✅ Validar que el query no esté vacío
    const queryTrimmed = query?.trim() || '';
    
    if (!queryTrimmed || queryTrimmed.length === 0) {
      console.warn('⚠️ Query vacío, retornando observable vacío');
      return new Observable(observer => {
        observer.next({ cfdis: [], total: 0 });
        observer.complete();
      });
    }
    
    // ✅ CORRECCIÓN: Usar el endpoint correcto
    const url = `${this.baseUrl}/cfdis/ingresos/busqueda-rapida`;
    
    console.log('🔍 URL completa:', url);
    console.log('🔍 Parámetros enviados:', { query: queryTrimmed });
    
    return this.http.get<any>(url, {
      params: { query: queryTrimmed },  // El RFC se obtiene del token en el backend
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Búsqueda avanzada de CFDIs de ingresos con múltiples filtros
   * @param filtros - Objeto con los filtros de búsqueda
   */
  busquedaAvanzadaIngresos(filtros: any): Observable<any> {
    console.log('🔍 ===== BÚSQUEDA AVANZADA DE INGRESOS =====');
    console.log('🔍 Filtros recibidos:', filtros);
    
    // ✅ Construir el query string combinando TODOS los campos de búsqueda
    const queryParts: string[] = [];
    
    if (filtros.rfc) queryParts.push(filtros.rfc);
    if (filtros.nombre) queryParts.push(filtros.nombre);
    if (filtros.uuid) queryParts.push(filtros.uuid);
    if (filtros.folio) queryParts.push(filtros.folio);
    if (filtros.serie) queryParts.push(filtros.serie);
    
    // Unir todos los términos de búsqueda con espacio
    const query = queryParts.join(' ').trim();
    
    console.log('🔍 Query construido:', query);
    console.log('🔍 Query length:', query.length);
    
    // ✅ Si no hay query Y no hay filtros de fecha/monto, retornar vacío
    if (!query && !filtros.fechaInicio && !filtros.fechaFin && 
        filtros.montoMin === null && filtros.montoMax === null &&
        !filtros.metodoPago && !filtros.formaPago) {
      console.warn('⚠️ Búsqueda avanzada sin filtros, retornando vacío');
      return new Observable(observer => {
        observer.next({ cfdis: [], total: 0 });
        observer.complete();
      });
    }
    
    // ✅ Usar el endpoint de búsqueda rápida con filtros adicionales
    const url = `${this.baseUrl}/cfdis/ingresos/busqueda-rapida`;
    
    // ✅ Construir query params con TODOS los filtros
    let params = new HttpParams();
    
    // Query principal (SOLO si existe)
    if (query) {
      params = params.set('query', query);
      console.log('✅ Query agregado a params:', query);
    }
    
    // Filtros adicionales
    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
      console.log('✅ FechaInicio agregada:', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
      console.log('✅ FechaFin agregada:', filtros.fechaFin);
    }
    if (filtros.montoMin !== null && filtros.montoMin !== undefined) {
      params = params.set('montoMin', filtros.montoMin.toString());
      console.log('✅ MontoMin agregado:', filtros.montoMin);
    }
    if (filtros.montoMax !== null && filtros.montoMax !== undefined) {
      params = params.set('montoMax', filtros.montoMax.toString());
      console.log('✅ MontoMax agregado:', filtros.montoMax);
    }
    if (filtros.metodoPago) {
      params = params.set('metodoPago', filtros.metodoPago);
      console.log('✅ MetodoPago agregado:', filtros.metodoPago);
    }
    if (filtros.formaPago) {
      params = params.set('formaPago', filtros.formaPago);
      console.log('✅ FormaPago agregada:', filtros.formaPago);
    }
    
    // Paginación
    params = params.set('offset', '0');
    params = params.set('limit', '100');
    
    console.log('🔍 URL final:', url);
    console.log('🔍 Parámetros finales:', params.toString());
    
    return this.http.get<any>(url, { 
      params,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ====== MÉTODOS AUXILIARES ======

  /**
   * Búsqueda rápida de egresos
   */
  busquedaRapidaEgresos(params: any): Observable<any> {
    const url = `${this.baseUrl}/cfdis/egresos/busqueda-rapida`;
    
    let queryParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams = queryParams.set(key, params[key].toString());
      }
    });
    
    return this.http.get<any>(url, {
      params: queryParams,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ====== MÉTODOS DE DETALLES DE CFDI ======

  /**
   * Obtiene los detalles completos de un CFDI
   * @param uuid - UUID del CFDI
   */
  getDetallesCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los impuestos de un CFDI
   * @param uuid - UUID del CFDI
   */
  getImpuestosCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}/impuestos`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene las retenciones de un CFDI
   * @param uuid - UUID del CFDI
   */
  getRetencionesCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}/retenciones`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene las partidas/conceptos de un CFDI
   * @param uuid - UUID del CFDI
   */
  getPartidasCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}/partidas`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los pagos relacionados de un CFDI (si es PPD)
   * @param uuid - UUID del CFDI
   */
  getPagosCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}/pagos`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el complemento de un CFDI (ej: Carta Porte)
   * @param uuid - UUID del CFDI
   */
  getComplementoCfdi(uuid: string): Observable<any> {
    const url = `${this.baseUrl}/cfdis/${uuid}/complemento`;
    return this.http.get<any>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Descarga el XML de un CFDI
   * @param uuid - UUID del CFDI
   */
  descargarXml(uuid: string): Observable<Blob> {
    const url = `${this.baseUrl}/cfdis/${uuid}/xml`;
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Descarga el PDF de un CFDI
   * @param uuid - UUID del CFDI
   */
  descargarPdf(uuid: string): Observable<Blob> {
    const url = `${this.baseUrl}/cfdis/${uuid}/pdf`;
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ====== MÉTODOS ADICIONALES PARA INGRESOS ======

  /**
   * Obtiene CFDIs pendientes de pago (PPD)
   * @param fechaInicio - Fecha inicial (opcional)
   * @param fechaFin - Fecha final (opcional)
   */
  getCfdisPendientesPago(fechaInicio?: string, fechaFin?: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();
    const url = `${this.baseUrl}/ingresos/pendientes-pago`;
    
    let params = new HttpParams();
    params = params.set('rfcUsuario', userRfc);
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    
    return this.http.get<any>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el historial de pagos de un cliente
   * @param rfc - RFC del cliente
   */
  getHistorialPagosCliente(rfc: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();
    const url = `${this.baseUrl}/ingresos/historial-pagos`;
    
    return this.http.get<any>(url, {
      params: { rfcUsuario: userRfc, rfcCliente: rfc }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el estado de cuenta de un cliente
   * @param rfc - RFC del cliente
   * @param fechaInicio - Fecha inicial (opcional)
   * @param fechaFin - Fecha final (opcional)
   */
  getEstadoCuentaCliente(rfc: string, fechaInicio?: string, fechaFin?: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();
    const url = `${this.baseUrl}/ingresos/estado-cuenta`;
    
    let params = new HttpParams();
    params = params.set('rfcUsuario', userRfc);
    params = params.set('rfcCliente', rfc);
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    
    return this.http.get<any>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Obtiene el RFC del usuario actual (privado)
   */
  private getCurrentUserRfc(): string {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.rfc || 'DIVM801101RJ9'; // Tu RFC como fallback
      }
    } catch (error) {
      console.error('Error obteniendo RFC del usuario:', error);
    }
    return 'DIVM801101RJ9'; // RFC por defecto
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en CfdiApiService:', error);
    
    let errorMessage = 'Ocurrió un error en el servidor';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Error del lado del servidor
      errorMessage = `Error ${error.status}: ${error.message}`;
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }

      // Mensajes específicos según el código de error
      switch (error.status) {
        case 401:
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor.';
          break;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}