export interface CFDINomina {
  // Datos generales
  ID?: number;
  serie: string;
  folio?: string;
  fecha: Date;
  tipo: string;
  
  // Datos de emisor
  sucursal: string;
  tipoPago: string;
  moneda: string;
  registroPatronal: string;
  
  // Datos específicos de la nómina
  tipoNomina: string;
  fechaPago: Date;
  fechaInicialPago?: Date;
  fechaFinalPago?: Date;
  diasPagados: number;
  
  // Datos del empleado
  empleado: EmpleadoNomina;
  
  // Partidas de la nómina
  percepciones: PercepcionNomina[];
  deducciones: DeduccionNomina[];
  otrosPagos: OtroPagoNomina[];
  
  // Totales
  totalPercepciones: number;
  totalDeducciones: number;
  totalOtrosPagos: number;
  total: number;
}

export interface EmpleadoNomina {
  ID?: number;
  numeroEmpleado: string;
  curp: string;
  rfc: string;
  nombre: string;
  departamento?: string;
  puesto?: string;
  numSeguridadSocial?: string;
  antiguedad?: string;
  clabe?: string;
  banco?: string;
  fechaInicioRelacionLaboral?: Date;
  tipoContrato: string;
  tipoJornada: string;
  salarioBaseCotizacion?: number;
  salarioDiarioIntegrado?: number;
  regimenContratacion: string;
  riesgoPuesto?: string;
}

export interface PercepcionNomina {
  tipo: string;
  clave: string;
  concepto: string;
  importeGravado: number;
  importeExento: number;
}

export interface DeduccionNomina {
  tipo: string;
  clave: string;
  concepto: string;
  importe: number;
}

export interface OtroPagoNomina {
  tipo: string;
  clave: string;
  concepto: string;
  importe: number;
}

// Catálogos para selecciones en los formularios
export interface CatalogoNomina {
  clave: string;
  descripcion: string;
}