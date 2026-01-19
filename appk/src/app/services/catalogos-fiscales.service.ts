import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CatalogoFiscal {
  descripcion: string;
  fechaInicioVigencia: string;
  fechaFinVigencia: string | null;
}

export interface TipoPercepcion extends CatalogoFiscal {
  c_TipoPercepcion: string;
}

export interface TipoDeduccion extends CatalogoFiscal {
  c_TipoDeduccion: string;
}

export interface TipoOtroPago extends CatalogoFiscal {
  c_TipoOtroPago: string;
}

export interface TipoNomina extends CatalogoFiscal {
  c_TipoNomina: string;
}

export interface TipoContrato extends CatalogoFiscal {
  c_TipoContrato: string;
}

export interface TipoJornada extends CatalogoFiscal {
  c_TipoJornada: string;
}

export interface TipoRegimen extends CatalogoFiscal {
  c_TipoRegimen: string;
}

export interface PeriodicidadPago extends CatalogoFiscal {
  c_PeriodicidadPago: string;
}

export interface Banco extends CatalogoFiscal {
  c_Banco: string;
  nombre_corto: string;
  razon_social: string;
}

export interface RiesgoPuesto extends CatalogoFiscal {
  c_RiesgoPuesto: string;
}

export interface TipoIncapacidad extends CatalogoFiscal {
  c_TipoIncapacidad: string;
}

export interface OrigenRecurso extends CatalogoFiscal {
  c_OrigenRecurso: string;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogosFiscalesService {
  private apiUrl = `${environment.satCatalogosUrl}/catalogos/fiscal`;

  constructor(private http: HttpClient) { }

  // ==================== PERCEPCIONES ====================
  getPercepciones(): Observable<TipoPercepcion[]> {
    return this.http.get<TipoPercepcion[]>(`${this.apiUrl}/percepciones`);
  }

  getPercepcionesVigentes(): Observable<TipoPercepcion[]> {
    return this.http.get<TipoPercepcion[]>(`${this.apiUrl}/percepciones/vigentes`);
  }

  getPercepcionById(id: string): Observable<TipoPercepcion> {
    return this.http.get<TipoPercepcion>(`${this.apiUrl}/percepciones/${id}`);
  }

  // ==================== DEDUCCIONES ====================
  getDeducciones(): Observable<TipoDeduccion[]> {
    return this.http.get<TipoDeduccion[]>(`${this.apiUrl}/deducciones`);
  }

  getDeduccionesVigentes(): Observable<TipoDeduccion[]> {
    return this.http.get<TipoDeduccion[]>(`${this.apiUrl}/deducciones/vigentes`);
  }

  getDeduccionById(id: string): Observable<TipoDeduccion> {
    return this.http.get<TipoDeduccion>(`${this.apiUrl}/deducciones/${id}`);
  }

  // ==================== OTROS PAGOS ====================
  getOtrosPagos(): Observable<TipoOtroPago[]> {
    return this.http.get<TipoOtroPago[]>(`${this.apiUrl}/otros-pagos`);
  }

  getOtrosPagosVigentes(): Observable<TipoOtroPago[]> {
    return this.http.get<TipoOtroPago[]>(`${this.apiUrl}/otros-pagos/vigentes`);
  }

  getOtroPagoById(id: string): Observable<TipoOtroPago> {
    return this.http.get<TipoOtroPago>(`${this.apiUrl}/otros-pagos/${id}`);
  }

  // ==================== TIPOS DE NÓMINA ====================
  getTiposNomina(): Observable<TipoNomina[]> {
    return this.http.get<TipoNomina[]>(`${this.apiUrl}/tipos-nomina`);
  }

  getTiposNominaVigentes(): Observable<TipoNomina[]> {
    return this.http.get<TipoNomina[]>(`${this.apiUrl}/tipos-nomina/vigentes`);
  }

  getTipoNominaById(id: string): Observable<TipoNomina> {
    return this.http.get<TipoNomina>(`${this.apiUrl}/tipos-nomina/${id}`);
  }

  // ==================== TIPOS DE CONTRATO ====================
  getTiposContrato(): Observable<TipoContrato[]> {
    return this.http.get<TipoContrato[]>(`${this.apiUrl}/tipos-contrato`);
  }

  getTiposContratoVigentes(): Observable<TipoContrato[]> {
    return this.http.get<TipoContrato[]>(`${this.apiUrl}/tipos-contrato/vigentes`);
  }

  getTipoContratoById(id: string): Observable<TipoContrato> {
    return this.http.get<TipoContrato>(`${this.apiUrl}/tipos-contrato/${id}`);
  }

  // ==================== TIPOS DE JORNADA ====================
  getTiposJornada(): Observable<TipoJornada[]> {
    return this.http.get<TipoJornada[]>(`${this.apiUrl}/tipos-jornada`);
  }

  getTiposJornadaVigentes(): Observable<TipoJornada[]> {
    return this.http.get<TipoJornada[]>(`${this.apiUrl}/tipos-jornada/vigentes`);
  }

  getTipoJornadaById(id: string): Observable<TipoJornada> {
    return this.http.get<TipoJornada>(`${this.apiUrl}/tipos-jornada/${id}`);
  }

  // ==================== TIPOS DE RÉGIMEN ====================
  getTiposRegimen(): Observable<TipoRegimen[]> {
    return this.http.get<TipoRegimen[]>(`${this.apiUrl}/tipos-regimen`);
  }

  getTiposRegimenVigentes(): Observable<TipoRegimen[]> {
    return this.http.get<TipoRegimen[]>(`${this.apiUrl}/tipos-regimen/vigentes`);
  }

  getTipoRegimenById(id: string): Observable<TipoRegimen> {
    return this.http.get<TipoRegimen>(`${this.apiUrl}/tipos-regimen/${id}`);
  }

  // ==================== PERIODICIDAD DE PAGO ====================
  getPeriodicidadesPago(): Observable<PeriodicidadPago[]> {
    return this.http.get<PeriodicidadPago[]>(`${this.apiUrl}/periodicidades-pago`);
  }

  getPeriodicidadesPagoVigentes(): Observable<PeriodicidadPago[]> {
    return this.http.get<PeriodicidadPago[]>(`${this.apiUrl}/periodicidades-pago/vigentes`);
  }

  getPeriodicidadPagoById(id: string): Observable<PeriodicidadPago> {
    return this.http.get<PeriodicidadPago>(`${this.apiUrl}/periodicidades-pago/${id}`);
  }

  // ==================== BANCOS ====================
  getBancos(): Observable<Banco[]> {
    return this.http.get<Banco[]>(`${this.apiUrl}/bancos`);
  }

  getBancosVigentes(): Observable<Banco[]> {
    return this.http.get<Banco[]>(`${this.apiUrl}/bancos/vigentes`);
  }

  getBancoById(id: string): Observable<Banco> {
    return this.http.get<Banco>(`${this.apiUrl}/bancos/${id}`);
  }

  // ==================== RIESGO DE PUESTO ====================
  getRiesgosPuesto(): Observable<RiesgoPuesto[]> {
    return this.http.get<RiesgoPuesto[]>(`${this.apiUrl}/riesgos-puesto`);
  }

  getRiesgosPuestoVigentes(): Observable<RiesgoPuesto[]> {
    return this.http.get<RiesgoPuesto[]>(`${this.apiUrl}/riesgos-puesto/vigentes`);
  }

  getRiesgoPuestoById(id: string): Observable<RiesgoPuesto> {
    return this.http.get<RiesgoPuesto>(`${this.apiUrl}/riesgos-puesto/${id}`);
  }

  // ==================== TIPOS DE INCAPACIDAD ====================
  getTiposIncapacidad(): Observable<TipoIncapacidad[]> {
    return this.http.get<TipoIncapacidad[]>(`${this.apiUrl}/tipos-incapacidad`);
  }

  getTiposIncapacidadVigentes(): Observable<TipoIncapacidad[]> {
    return this.http.get<TipoIncapacidad[]>(`${this.apiUrl}/tipos-incapacidad/vigentes`);
  }

  getTipoIncapacidadById(id: string): Observable<TipoIncapacidad> {
    return this.http.get<TipoIncapacidad>(`${this.apiUrl}/tipos-incapacidad/${id}`);
  }

  // ==================== ORIGEN DE RECURSO ====================
  getOrigenesRecurso(): Observable<OrigenRecurso[]> {
    return this.http.get<OrigenRecurso[]>(`${this.apiUrl}/origenes-recurso`);
  }

  getOrigenesRecursoVigentes(): Observable<OrigenRecurso[]> {
    return this.http.get<OrigenRecurso[]>(`${this.apiUrl}/origenes-recurso/vigentes`);
  }

  getOrigenRecursoById(id: string): Observable<OrigenRecurso> {
    return this.http.get<OrigenRecurso>(`${this.apiUrl}/origenes-recurso/${id}`);
  }
}