import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/* =========================================================
   INTERFACES GENERALES
========================================================= */

export interface CfdiRecibido {
  id: number;
  rfc_receptor: string;
  rfc_emisor: string;
  nombre_emisor?: string;
  fecha_recepcion: string;
  usuario_id: string;
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

/* =========================================================
   BÚSQUEDAS Y DETALLE
========================================================= */

export interface AdvancedSearchIngresosPayload {
  rfc?: string;
  nombre?: string;
  uuid?: string;
  folio?: string;
  serie?: string;
  fechaInicio?: string;
  fechaFin?: string;
  montoMin?: number;
  montoMax?: number;
  metodoPago?: string;
  formaPago?: string;
  rfcReceptor?: string;
  tipoComprobante?: string;
}

export interface AdvancedSearchEgresosPayload {
  rfc?: string;
  nombre?: string;
  uuid?: string;
  folio?: string;
  serie?: string;
  fechaInicio?: string;
  fechaFin?: string;
  montoMin?: number;
  montoMax?: number;
}

export interface CfdiSearchResponse<T = any> {
  success?: boolean;
  mensaje?: string;
  cfdis: T[];
  total?: number;
}

export interface CfdiImpuestosResponse {
  success: boolean;
  impuestos: any[];
}

export interface CfdiRetencionesResponse {
  success: boolean;
  retenciones: any[];
}

export interface CfdiPartidasResponse {
  success: boolean;
  partidas: any[];
}

export interface CfdiPagosResponse {
  success: boolean;
  pagos: any[];
}

/* =========================================================
   SERVICE
========================================================= */

@Injectable({
  providedIn: 'root'
})
export class CfdiApiService {
  private baseUrl = 'https://energetic-communication-production-5b96.up.railway.app/xml-financiero';

  constructor(private http: HttpClient) {}

  /* =========================================================
     HELPERS PRIVADOS
  ========================================================= */

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private buildHttpParams(
    params: Record<string, string | number | boolean | null | undefined>
  ): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  private getCurrentUserRfc(): string {
    // Primero intentar RFC de la cuenta activa (para sub-usuarios)
    const activeCuentaRfc = localStorage.getItem('activeCuentaRfc');
    if (activeCuentaRfc) {
      return activeCuentaRfc;
    }
    // Fallback: RFC del usuario logueado
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.rfc || '';
      }
    } catch (error) {
      console.error('Error obteniendo RFC del usuario:', error);
    }

    return '';
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ Error en CfdiApiService:', error);

    let errorMessage = 'Ocurrió un error en el servidor';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }

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

  /* =========================================================
     AUTH
     Ojo: según tu backend mostrado, auth no está dentro de
     XmlFinancieroController. Si tus rutas reales de auth están
     fuera de /xml-financiero, esto se mantiene aparte.
  ========================================================= */

  login(firebaseToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      'https://energetic-communication-production-5b96.up.railway.app/auth/login',
      { firebaseToken }
    ).pipe(
      catchError(this.handleError)
    );
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      'https://energetic-communication-production-5b96.up.railway.app/auth/refresh',
      { refresh_token: refreshToken }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     IMPORTACIÓN XML
     Ojo: estos endpoints no aparecen en el controller mostrado.
     Si realmente existen en otro controller bajo /xml-import,
     deben seguir apuntando fuera de /xml-financiero.
  ========================================================= */

  importarEstructuraCompleta(rutaBase: string): Observable<any> {
    return this.http.post(
      'https://energetic-communication-production-5b96.up.railway.app/xml-import/estructura-completa',
      { rutaBase },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getEstadisticasImportacion(): Observable<any> {
    return this.http.get(
      'https://energetic-communication-production-5b96.up.railway.app/xml-import/estadisticas',
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  reprocesarRfcs(): Observable<any> {
    return this.http.post(
      'https://energetic-communication-production-5b96.up.railway.app/xml-import/reprocesar-rfcs',
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     ESTADÍSTICAS FINANCIERAS
  ========================================================= */

  procesarTodosLosXmls(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/procesar-todos`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getEstadisticasFinancieras(): Observable<EstadisticasFinancieras> {
    return this.http.get<EstadisticasFinancieras>(
      `${this.baseUrl}/estadisticas`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getAnalisisPorPeriodo(fechaInicio: string, fechaFin: string): Observable<AnalisisPeriodo> {
    return this.http.get<AnalisisPeriodo>(
      `${this.baseUrl}/analisis-periodo`,
      {
        params: this.buildHttpParams({ fechaInicio, fechaFin }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getResumenIva(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/resumen-iva`,
      {
        params: this.buildHttpParams({ fechaInicio, fechaFin }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getTopProveedores(
    fechaInicio: string,
    fechaFin: string,
    limite: number = 10
  ): Observable<TopProveedoresResponse> {
    return this.http.get<TopProveedoresResponse>(
      `${this.baseUrl}/top-proveedores`,
      {
        params: this.buildHttpParams({
          fechaInicio,
          fechaFin,
          limite
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     CFDIs GENERALES
     Ojo: según el controller mostrado, /ingresos y /egresos
     siguen requiriendo rfcUsuario explícito.
  ========================================================= */

  getCfdisIngreso(rfcUsuario: string, fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/ingresos`,
      {
        params: this.buildHttpParams({
          rfcUsuario,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getCfdisEgreso(rfcUsuario: string, fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/egresos`,
      {
        params: this.buildHttpParams({
          rfcUsuario,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getCfdisByUserId(userId: string): Observable<CfdiRecibido[]> {
    return this.http.get<CfdiRecibido[]>(
      `https://energetic-communication-production-5b96.up.railway.app/cfdis/user/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getCfdisByProviderRfc(userId: string, providerRfc: string): Observable<CfdiRecibido[]> {
    return this.http.get<CfdiRecibido[]>(
      `https://energetic-communication-production-5b96.up.railway.app/cfdis/user/${userId}/provider/${providerRfc}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPendingCfdis(userId: string): Observable<CfdiRecibido[]> {
    return this.http.get<CfdiRecibido[]>(
      `https://energetic-communication-production-5b96.up.railway.app/cfdis/user/${userId}/pending`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     INGRESOS
  ========================================================= */

  getAnalisisCompletoIngresos(fechaInicio: string, fechaFin: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();

    return this.http.get(
      `${this.baseUrl}/ingresos/analisis-completo`,
      {
        params: this.buildHttpParams({
          rfcUsuario: userRfc,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  buscarCfdisIngresos(query: string): Observable<CfdiSearchResponse> {
    const queryTrimmed = query?.trim() || '';

    if (!queryTrimmed) {
      return of({ cfdis: [], total: 0 });
    }

    return this.http.get<CfdiSearchResponse>(
      `${this.baseUrl}/cfdis/ingresos/busqueda-rapida`,
      {
        params: this.buildHttpParams({
          query: queryTrimmed,
          offset: 0,
          limit: 50
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  busquedaAvanzadaIngresos(
  filtros: AdvancedSearchIngresosPayload
): Observable<CfdiSearchResponse> {
  const queryParts: string[] = [];

  if (filtros.rfc) queryParts.push(filtros.rfc);
  if (filtros.nombre) queryParts.push(filtros.nombre);
  if (filtros.uuid) queryParts.push(filtros.uuid);
  if (filtros.folio) queryParts.push(filtros.folio);
  if (filtros.serie) queryParts.push(filtros.serie);

  const query = queryParts.join(' ').trim();

  if (
    !query &&
    !filtros.fechaInicio &&
    !filtros.fechaFin &&
    filtros.montoMin === undefined &&
    filtros.montoMax === undefined &&
    !filtros.metodoPago &&
    !filtros.formaPago &&
    !filtros.rfcReceptor &&
    !filtros.tipoComprobante
  ) {
    return of({ cfdis: [], total: 0 });
  }

  return this.http.get<CfdiSearchResponse>(
    `${this.baseUrl}/cfdis/ingresos/busqueda-rapida`,
    {
      params: this.buildHttpParams({
        query,
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        montoMin: filtros.montoMin,
        montoMax: filtros.montoMax,
        metodoPago: filtros.metodoPago,
        formaPago: filtros.formaPago,
        rfcReceptor: filtros.rfcReceptor,
        tipoComprobante: filtros.tipoComprobante,
        offset: 0,
        limit: 100
      }),
      headers: this.getHeaders()
    }
  ).pipe(
    catchError(this.handleError)
  );
}

  getCfdisPendientesPago(fechaInicio?: string, fechaFin?: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();

    return this.http.get<any>(
      `${this.baseUrl}/ingresos/pendientes-pago`,
      {
        params: this.buildHttpParams({
          rfcUsuario: userRfc,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getHistorialPagosCliente(rfc: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();

    return this.http.get<any>(
      `${this.baseUrl}/ingresos/historial-pagos`,
      {
        params: this.buildHttpParams({
          rfcUsuario: userRfc,
          rfcCliente: rfc
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getEstadoCuentaCliente(rfc: string, fechaInicio?: string, fechaFin?: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();

    return this.http.get<any>(
      `${this.baseUrl}/ingresos/estado-cuenta`,
      {
        params: this.buildHttpParams({
          rfcUsuario: userRfc,
          rfcCliente: rfc,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     EGRESOS
  ========================================================= */

  getAnalisisCompletoEgresos(fechaInicio: string, fechaFin: string): Observable<any> {
    const userRfc = this.getCurrentUserRfc();

    return this.http.get(
      `${this.baseUrl}/egresos/analisis-completo`,
      {
        params: this.buildHttpParams({
          rfcUsuario: userRfc,
          fechaInicio,
          fechaFin
        }),
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  buscarCfdisEgresos(query: string): Observable<CfdiSearchResponse> {
  const queryTrimmed = query?.trim() || '';

  if (!queryTrimmed) {
    return of({ cfdis: [], total: 0 });
  }

  return this.busquedaRapidaEgresos({
    query: queryTrimmed,
    offset: 0,
    limit: 50
  });
}

  busquedaAvanzadaEgresos(
  filtros: AdvancedSearchEgresosPayload
): Observable<CfdiSearchResponse> {
  const queryParts: string[] = [];

  if (filtros.rfc) queryParts.push(filtros.rfc);
  if (filtros.nombre) queryParts.push(filtros.nombre);
  if (filtros.uuid) queryParts.push(filtros.uuid);
  if (filtros.folio) queryParts.push(filtros.folio);
  if (filtros.serie) queryParts.push(filtros.serie);

  const query = queryParts.join(' ').trim();

  if (
    !query &&
    !filtros.fechaInicio &&
    !filtros.fechaFin &&
    filtros.montoMin === undefined &&
    filtros.montoMax === undefined
  ) {
    return of({ cfdis: [], total: 0 });
  }

  return this.busquedaRapidaEgresos({
    query,
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    montoMin: filtros.montoMin,
    montoMax: filtros.montoMax,
    offset: 0,
    limit: 100
  });
}
  busquedaRapidaEgresos(
  params: Record<string, string | number | null | undefined>
): Observable<CfdiSearchResponse> {
  return this.http.get<CfdiSearchResponse>(
    `${this.baseUrl}/cfdis/egresos/busqueda-rapida`,
    {
      params: this.buildHttpParams(params),
      headers: this.getHeaders()
    }
  ).pipe(
    catchError(this.handleError)
  );
}

  /* =========================================================
     DETALLE CFDI
  ========================================================= */

  getDetallesCfdi(uuid: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/cfdis/${uuid}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getImpuestosCfdi(uuid: string): Observable<CfdiImpuestosResponse> {
    return this.http.get<CfdiImpuestosResponse>(
      `${this.baseUrl}/cfdis/${uuid}/impuestos`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getRetencionesCfdi(uuid: string): Observable<CfdiRetencionesResponse> {
    return this.http.get<CfdiRetencionesResponse>(
      `${this.baseUrl}/cfdis/${uuid}/retenciones`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPartidasCfdi(uuid: string): Observable<CfdiPartidasResponse> {
    return this.http.get<CfdiPartidasResponse>(
      `${this.baseUrl}/cfdis/${uuid}/partidas`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPagosCfdi(uuid: string): Observable<CfdiPagosResponse> {
    return this.http.get<CfdiPagosResponse>(
      `${this.baseUrl}/cfdis/${uuid}/pagos`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getComplementoCfdi(uuid: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/cfdis/${uuid}/complemento`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /* =========================================================
     DESCARGAS
  ========================================================= */

  descargarXml(uuid: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/cfdis/${uuid}/xml`,
      {
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  descargarPdf(uuid: string, style?: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/cfdis/${uuid}/pdf`,
      {
        headers: this.getHeaders(),
        params: this.buildHttpParams({ style }),
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }
}
