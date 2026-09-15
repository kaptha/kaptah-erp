import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/* =========================================================
   TIPOS (espejo de sat_solicitudes en cfdi-receiver-api)
========================================================= */

export type SatSolicitudTipo = 'RECIBIDOS' | 'EMITIDOS';
export type SatSolicitudTipoSolicitud = 'CFDI' | 'Metadata';
export type SatSolicitudEstado =
  | 'ENVIADA'
  | 'LISTA'
  | 'DESCARGANDO'
  | 'IMPORTADA'
  | 'SIN_CFDI'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'ERROR';

export interface SatPaquete {
  id: string;
  descargado: boolean;
  bytes?: number;
  cfdisEnPaquete?: number;
  cfdisImportados?: number;
  duplicados?: number;
  error?: string;
}

export interface SatSolicitud {
  id: string;
  cuentaUid: string;
  rfc: string;
  idSolicitud: string;
  tipo: SatSolicitudTipo;
  tipoSolicitud: SatSolicitudTipoSolicitud;
  fechaInicial: string;
  fechaFinal: string;
  estado: SatSolicitudEstado;
  estadoSolicitudSat: number | null;
  codigoEstadoSat: number | null;
  numeroCfdis: number;
  paquetes: SatPaquete[];
  origen: 'CRON' | 'MANUAL';
  intentosVerificacion: number;
  ultimaVerificacion: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SolicitarPayload {
  tipo: SatSolicitudTipo;
  tipoSolicitud: SatSolicitudTipoSolicitud;
  fechaInicial: string; // YYYY-MM-DD
  fechaFinal: string;   // YYYY-MM-DD
}

/* =========================================================
   SERVICE — descarga masiva directa del SAT (sustituye a SIFEI)
========================================================= */

@Injectable({
  providedIn: 'root'
})
export class SatDescargaService {
  private baseUrl = 'https://energetic-communication-production-5b96.up.railway.app/sat-descarga';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Cuenta activa (Plan Despacho); si no hay, el backend usa la del JWT */
  private getParams(): HttpParams {
    let params = new HttpParams();
    const cuentaUid = localStorage.getItem('activeCuentaUid');
    if (cuentaUid) {
      params = params.set('cuentaUid', cuentaUid);
    }
    return params;
  }

  private handleError(error: any): Observable<never> {
    const mensaje =
      error?.error?.message ||
      (error?.status === 401 ? 'Tu sesión expiró. Inicia sesión de nuevo.' : null) ||
      (error?.status === 409 ? 'Ya existe una solicitud para ese periodo.' : null) ||
      'No se pudo completar la operación con el SAT.';
    return throwError(() => new Error(Array.isArray(mensaje) ? mensaje.join(' ') : mensaje));
  }

  listar(): Observable<SatSolicitud[]> {
    return this.http
      .get<SatSolicitud[]>(`${this.baseUrl}/solicitudes`, { headers: this.getHeaders(), params: this.getParams() })
      .pipe(catchError(this.handleError));
  }

  obtener(id: string): Observable<SatSolicitud> {
    return this.http
      .get<SatSolicitud>(`${this.baseUrl}/solicitudes/${id}`, { headers: this.getHeaders(), params: this.getParams() })
      .pipe(catchError(this.handleError));
  }

  solicitar(payload: SolicitarPayload): Observable<SatSolicitud> {
    return this.http
      .post<SatSolicitud>(`${this.baseUrl}/solicitudes`, payload, { headers: this.getHeaders(), params: this.getParams() })
      .pipe(catchError(this.handleError));
  }

  /** Verifica con el SAT y, si ya está lista, descarga e importa */
  procesar(id: string): Observable<SatSolicitud> {
    return this.http
      .post<SatSolicitud>(`${this.baseUrl}/solicitudes/${id}/procesar`, {}, { headers: this.getHeaders(), params: this.getParams() })
      .pipe(catchError(this.handleError));
  }
}
