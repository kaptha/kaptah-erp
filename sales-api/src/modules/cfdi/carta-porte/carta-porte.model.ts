import { randomUUID } from 'crypto';

/**
 * Contrato de datos: CFDI 4.0 + Complemento Carta Porte 3.1
 * (Copia del modelo del frontend: appk/.../add-carta-porte-modal/carta-porte-31.model.ts)
 * Alcance fase 1: Autotransporte (carretera). Maritimo, aereo y ferroviario
 * quedan fuera hasta que se implementen completos.
 *
 * Regla: los nombres de propiedades coinciden 1:1 con los atributos y nodos
 * del XSD del SAT, para que el backend arme el XML sin traducir nombres.
 * Los valores numericos viajan como number; el backend los formatea con los
 * decimales que exige el XSD al construir el XML.
 */

// ============================================================
// Tipos base
// ============================================================

export type TipoComprobanteCP = 'I' | 'T';
export type SiNo = 'Sí' | 'No';
export type TipoUbicacion = 'Origen' | 'Destino';

/** c_FiguraTransporte */
export type TipoFiguraClave = '01' | '02' | '03' | '04' | '05';

/** c_ObjetoImp: 01 No objeto, 02 Si objeto, 03 Si objeto no obligado al desglose */
export type ObjetoImp = '01' | '02' | '03';

// ============================================================
// CFDI 4.0
// ============================================================

export interface CfdiCartaPorte {
  Version: '4.0';
  Serie?: string;
  Folio?: string;
  /** La asigna el backend al momento de timbrar (AAAA-MM-DDThh:mm:ss) */
  Fecha?: string;
  TipoDeComprobante: TipoComprobanteCP;
  LugarExpedicion: string;
  Exportacion: '01' | '02' | '03' | '04';
  /** 'XXX' en Traslado */
  Moneda: string;
  SubTotal: number;
  Descuento?: number;
  Total: number;
  /** Solo Ingreso */
  FormaPago?: string;
  /** Solo Ingreso */
  MetodoPago?: 'PUE' | 'PPD';
  Emisor: EmisorCP;
  Receptor: ReceptorCP;
  Conceptos: ConceptoCP[];
  Complemento: {
    CartaPorte: CartaPorte31;
  };
}

export interface EmisorCP {
  Rfc: string;
  Nombre: string;
  RegimenFiscal: string;
}

export interface ReceptorCP {
  Rfc: string;
  Nombre: string;
  /** CP del domicilio fiscal del receptor */
  DomicilioFiscalReceptor: string;
  RegimenFiscalReceptor: string;
  /** 'S01' en Traslado */
  UsoCFDI: string;
}

export interface ImpuestoConceptoCP {
  Base: number;
  /** 002 = IVA */
  Impuesto: '001' | '002' | '003';
  TipoFactor: 'Tasa' | 'Cuota' | 'Exento';
  TasaOCuota?: number;
  Importe?: number;
}

export interface ConceptoCP {
  ClaveProdServ: string;
  NoIdentificacion?: string;
  Cantidad: number;
  ClaveUnidad: string;
  Unidad?: string;
  Descripcion: string;
  ValorUnitario: number;
  Importe: number;
  ObjetoImp: ObjetoImp;
  Impuestos?: {
    Traslados?: ImpuestoConceptoCP[];
    Retenciones?: ImpuestoConceptoCP[];
  };
}

// ============================================================
// Complemento Carta Porte 3.1
// ============================================================

export interface CartaPorte31 {
  Version: '3.1';
  /** CCC + UUID v4 sin sus 3 primeros caracteres (36 caracteres) */
  IdCCP: string;
  TranspInternac: SiNo;
  /** Requerido si TranspInternac = 'Sí' (maximo 10) */
  RegimenesAduaneros?: { RegimenAduanero: string }[];
  EntradaSalidaMerc?: 'Entrada' | 'Salida';
  /** c_Pais */
  PaisOrigenDestino?: string;
  /** c_CveTransporte (01 = Autotransporte) */
  ViaEntradaSalida?: string;
  /** Suma de DistanciaRecorrida de los destinos; requerido en autotransporte */
  TotalDistRec?: number;
  RegistroISTMO?: SiNo;
  UbicacionPoloOrigen?: string;
  UbicacionPoloDestino?: string;

  Ubicaciones: UbicacionCP[];
  Mercancias: MercanciasCP;
  /** En autotransporte es obligatorio al menos un Operador (01) */
  FiguraTransporte: TipoFiguraCP[];
}

export interface DomicilioCP {
  Calle?: string;
  NumeroExterior?: string;
  NumeroInterior?: string;
  /** Clave c_Colonia cuando Pais = MEX */
  Colonia?: string;
  /** Clave c_Localidad cuando Pais = MEX */
  Localidad?: string;
  Referencia?: string;
  /** Clave c_Municipio cuando Pais = MEX */
  Municipio?: string;
  /** c_Estado */
  Estado: string;
  /** c_Pais */
  Pais: string;
  CodigoPostal: string;
}

export interface UbicacionCP {
  TipoUbicacion: TipoUbicacion;
  /** OR000001 / DE000001 */
  IDUbicacion?: string;
  RFCRemitenteDestinatario: string;
  NombreRemitenteDestinatario?: string;
  /** Solo si el RFC es el generico de extranjeros */
  NumRegIdTrib?: string;
  ResidenciaFiscal?: string;
  /** Salida si es Origen, llegada si es Destino (AAAA-MM-DDThh:mm:ss) */
  FechaHoraSalidaLlegada: string;
  /** Solo en destinos; requerida en autotransporte (km) */
  DistanciaRecorrida?: number;
  /** Requerido en autotransporte */
  Domicilio?: DomicilioCP;
}

export interface MercanciasCP {
  /** Suma de PesoEnKg */
  PesoBrutoTotal: number;
  /** c_ClaveUnidadPeso */
  UnidadPeso: string;
  PesoNetoTotal?: number;
  /** Numero de nodos Mercancia */
  NumTotalMercancias: number;
  CargoPorTasacion?: number;
  LogisticaInversaRecoleccionDevolucion?: 'Sí';
  Mercancia: MercanciaCP[];
  Autotransporte?: AutotransporteCP;
}

export interface DocumentacionAduaneraCP {
  /** c_DocumentoAduanero */
  TipoDocumento: string;
  NumPedimento?: string;
  IdentDocAduanero?: string;
  RFCImpo?: string;
}

export interface CantidadTransportaCP {
  Cantidad: number;
  IDOrigen: string;
  IDDestino: string;
  CvesTransporte?: string;
}

export interface MercanciaCP {
  /** c_ClaveProdServCP */
  BienesTransp: string;
  ClaveSTCC?: string;
  Descripcion: string;
  Cantidad: number;
  /** c_ClaveUnidad */
  ClaveUnidad: string;
  Unidad?: string;
  /** Formato 30/40/30cm o 30/40/30plg */
  Dimensiones?: string;
  /** Requerido si la clave BienesTransp lo marca como posible material peligroso */
  MaterialPeligroso?: SiNo;
  /** c_MaterialPeligroso; requerido si MaterialPeligroso = 'Sí' */
  CveMaterialPeligroso?: string;
  /** c_TipoEmbalaje; requerido si MaterialPeligroso = 'Sí' */
  Embalaje?: string;
  DescripEmbalaje?: string;
  PesoEnKg: number;
  ValorMercancia?: number;
  Moneda?: string;
  FraccionArancelaria?: string;
  UUIDComercioExt?: string;
  TipoMateria?: string;
  DescripcionMateria?: string;
  // Atributos COFEPRIS (SectorCOFEPRIS, NombreIngredienteActivo, etc.)
  // no incluidos en fase 1.
  DocumentacionAduanera?: DocumentacionAduaneraCP[];
  CantidadTransporta?: CantidadTransportaCP[];
}

export interface AutotransporteCP {
  /** c_TipoPermiso (TPAF01, TPAF02, ...) */
  PermSCT: string;
  NumPermisoSCT: string;
  IdentificacionVehicular: {
    /** c_ConfigAutotransporte (C2, C3, T3S2, VL, ...) */
    ConfigVehicular: string;
    /** Toneladas */
    PesoBrutoVehicular: number;
    /** Solo alfanumericos, sin guiones ni espacios */
    PlacaVM: string;
    AnioModeloVM: number;
  };
  Seguros: {
    AseguraRespCivil: string;
    PolizaRespCivil: string;
    /** Requeridos si alguna mercancia es material peligroso */
    AseguraMedAmbiente?: string;
    PolizaMedAmbiente?: string;
    AseguraCarga?: string;
    PolizaCarga?: string;
    PrimaSeguro?: number;
  };
  /** Opcional segun ConfigVehicular; maximo 2 */
  Remolques?: { SubTipoRem: string; Placa: string }[];
}

export interface TipoFiguraCP {
  TipoFigura: TipoFiguraClave;
  RFCFigura?: string;
  /** Requerido para Operador (01) */
  NumLicencia?: string;
  NombreFigura: string;
  NumRegIdTribFigura?: string;
  ResidenciaFiscalFigura?: string;
  /** c_ParteTransporte; aplica a Propietario (02) y Arrendador (03) */
  PartesTransporte?: { ParteTransporte: string }[];
  Domicilio?: DomicilioCP;
}

// ============================================================
// Constantes
// ============================================================

/** Valores fijos de un CFDI de Traslado con Carta Porte */
export const TRASLADO_DEFAULTS = {
  TipoDeComprobante: 'T' as const,
  Moneda: 'XXX',
  SubTotal: 0,
  Total: 0,
  UsoCFDI: 'S01',
  ObjetoImp: '01' as ObjetoImp,
  Exportacion: '01' as const,
};

/** Concepto tipico de un CFDI de Ingreso de un transportista */
export const INGRESO_TRANSPORTISTA_DEFAULTS = {
  TipoDeComprobante: 'I' as const,
  ClaveProdServ: '78101802', // Transporte de carga por carretera nacional
  ClaveUnidad: 'E48',        // Unidad de servicio
  ObjetoImp: '02' as ObjetoImp,
  Exportacion: '01' as const,
  TasaIVA: 0.16,
  /** Retencion de IVA en autotransporte cuando el receptor es persona moral */
  TasaRetencionIVA: 0.04,
};

export const TIPOS_FIGURA: { clave: TipoFiguraClave; descripcion: string }[] = [
  { clave: '01', descripcion: 'Operador' },
  { clave: '02', descripcion: 'Propietario' },
  { clave: '03', descripcion: 'Arrendador' },
  { clave: '04', descripcion: 'Notificado' },
  { clave: '05', descripcion: 'Integrante de Coordinados' },
];

export const MAX_REMOLQUES = 2;
export const MAX_REGIMENES_ADUANEROS = 10;

export const PATRONES_CP = {
  rfc: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
  codigoPostal: /^[0-9]{5}$/,
  idUbicacion: /^(OR|DE)[0-9]{6}$/,
  idCCP: /^CCC[0-9A-F]{5}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
  placa: /^[A-Z0-9]{5,7}$/,
  anioModelo: /^(19|20)[0-9]{2}$/,
};

// ============================================================
// Helpers puros
// ============================================================

/**
 * Genera el IdCCP: un UUID v4 con sus 3 primeros caracteres reemplazados por "CCC".
 * Idealmente lo genera el backend al timbrar; se deja aqui para vista previa.
 */
export function generarIdCCP(): string {
  const uuid = randomUUID().toUpperCase();
  return 'CCC' + uuid.substring(3);
}

/** IDs consecutivos (OR000001, DE000001, DE000002...) para evitar colisiones */
export function generarIdUbicacion(tipo: TipoUbicacion, consecutivo: number): string {
  const prefijo = tipo === 'Origen' ? 'OR' : 'DE';
  return prefijo + String(consecutivo).padStart(6, '0');
}

/** Reasigna los IDUbicacion de toda la lista en orden */
export function renumerarUbicaciones(ubicaciones: UbicacionCP[]): UbicacionCP[] {
  let or = 0;
  let de = 0;
  return ubicaciones.map(u => ({
    ...u,
    IDUbicacion:
      u.TipoUbicacion === 'Origen'
        ? generarIdUbicacion('Origen', ++or)
        : generarIdUbicacion('Destino', ++de),
  }));
}

/** Formato de fecha CFDI en hora local: AAAA-MM-DDThh:mm:ss */
export function formatearFechaCfdi(fecha: Date | string): string {
  const d = new Date(fecha);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

export function calcularTotalDistRec(ubicaciones: UbicacionCP[]): number {
  const total = ubicaciones
    .filter(u => u.TipoUbicacion === 'Destino')
    .reduce((acc, u) => acc + (Number(u.DistanciaRecorrida) || 0), 0);
  return Math.round(total * 100) / 100;
}

export function calcularPesoBrutoTotal(mercancias: MercanciaCP[]): number {
  const total = mercancias.reduce((acc, m) => acc + (Number(m.PesoEnKg) || 0), 0);
  return Math.round(total * 1000) / 1000;
}

/**
 * Validaciones de negocio previas al envio al backend.
 * No sustituye la validacion contra el XSD ni la del PAC.
 * Regresa una lista de mensajes; vacia = sin errores detectados.
 */
export function validarCartaPorte(cfdi: CfdiCartaPorte): string[] {
  const errores: string[] = [];
  const cp = cfdi.Complemento.CartaPorte;
  const mercancias = cp.Mercancias;
  const esAutotransporte = !!mercancias.Autotransporte;

  // --- CFDI ---
  if (!PATRONES_CP.codigoPostal.test(cfdi.LugarExpedicion)) {
    errores.push('LugarExpedicion debe ser un código postal de 5 dígitos.');
  }
  if (!PATRONES_CP.rfc.test(cfdi.Emisor.Rfc)) {
    errores.push('RFC del emisor con formato inválido.');
  }
  if (!PATRONES_CP.codigoPostal.test(cfdi.Receptor.DomicilioFiscalReceptor)) {
    errores.push('DomicilioFiscalReceptor debe ser un código postal de 5 dígitos.');
  }
  if (cfdi.Conceptos.length === 0) {
    errores.push('El CFDI debe tener al menos un concepto.');
  }

  if (cfdi.TipoDeComprobante === 'T') {
    if (cfdi.Moneda !== 'XXX') errores.push('En Traslado la moneda debe ser XXX.');
    if (cfdi.SubTotal !== 0 || cfdi.Total !== 0) {
      errores.push('En Traslado SubTotal y Total deben ser 0.');
    }
    if (cfdi.Receptor.UsoCFDI !== 'S01') {
      errores.push('En Traslado el UsoCFDI debe ser S01.');
    }
    if (cfdi.FormaPago || cfdi.MetodoPago) {
      errores.push('En Traslado no se registran FormaPago ni MetodoPago.');
    }
  }

  // --- Complemento ---
  if (!PATRONES_CP.idCCP.test(cp.IdCCP)) {
    errores.push('IdCCP con formato inválido.');
  }
  if (cp.TranspInternac === 'Sí') {
    if (!cp.EntradaSalidaMerc) errores.push('Transporte internacional: falta EntradaSalidaMerc.');
    if (!cp.PaisOrigenDestino) errores.push('Transporte internacional: falta PaisOrigenDestino.');
    if (!cp.ViaEntradaSalida) errores.push('Transporte internacional: falta ViaEntradaSalida.');
    const regs = cp.RegimenesAduaneros ?? [];
    if (regs.length === 0) errores.push('Transporte internacional: falta al menos un RegimenAduanero.');
    if (regs.length > MAX_REGIMENES_ADUANEROS) {
      errores.push(`Máximo ${MAX_REGIMENES_ADUANEROS} regímenes aduaneros.`);
    }
  }

  // --- Ubicaciones ---
  const ubs = cp.Ubicaciones;
  if (!ubs.some(u => u.TipoUbicacion === 'Origen')) errores.push('Falta al menos una ubicación de Origen.');
  if (!ubs.some(u => u.TipoUbicacion === 'Destino')) errores.push('Falta al menos una ubicación de Destino.');
  if (ubs.length > 0 && ubs[0].TipoUbicacion !== 'Origen') {
    errores.push('La primera ubicación debe ser el Origen.');
  }

  const ids = new Set<string>();
  ubs.forEach((u, i) => {
    const n = `Ubicación ${i + 1}`;
    if (!u.RFCRemitenteDestinatario) errores.push(`${n}: falta RFC del remitente/destinatario.`);
    if (!u.FechaHoraSalidaLlegada) errores.push(`${n}: falta fecha y hora de salida/llegada.`);
    if (u.IDUbicacion) {
      if (!PATRONES_CP.idUbicacion.test(u.IDUbicacion)) errores.push(`${n}: IDUbicacion inválido.`);
      if (ids.has(u.IDUbicacion)) errores.push(`${n}: IDUbicacion duplicado.`);
      ids.add(u.IDUbicacion);
    }
    if (u.TipoUbicacion === 'Origen' && u.DistanciaRecorrida) {
      errores.push(`${n}: el Origen no lleva DistanciaRecorrida.`);
    }
    if (esAutotransporte) {
      if (u.TipoUbicacion === 'Destino' && !(Number(u.DistanciaRecorrida) > 0)) {
        errores.push(`${n}: falta DistanciaRecorrida del destino.`);
      }
      if (!u.Domicilio) {
        errores.push(`${n}: en autotransporte el domicilio es obligatorio.`);
      } else if (!u.Domicilio.Estado || !u.Domicilio.Pais || !PATRONES_CP.codigoPostal.test(u.Domicilio.CodigoPostal)) {
        errores.push(`${n}: el domicilio requiere Estado, País y Código Postal válido.`);
      }
    }
  });

  // --- Mercancias ---
  if (mercancias.Mercancia.length === 0) errores.push('Debe registrarse al menos una mercancía.');
  if (mercancias.NumTotalMercancias !== mercancias.Mercancia.length) {
    errores.push('NumTotalMercancias no coincide con el número de mercancías.');
  }
  if (mercancias.UnidadPeso === 'KGM' &&
      Math.abs(mercancias.PesoBrutoTotal - calcularPesoBrutoTotal(mercancias.Mercancia)) > 0.001) {
    errores.push('PesoBrutoTotal no coincide con la suma de PesoEnKg.');
  }

  let hayMaterialPeligroso = false;
  mercancias.Mercancia.forEach((m, i) => {
    const n = `Mercancía ${i + 1}`;
    if (!m.BienesTransp) errores.push(`${n}: falta la clave BienesTransp.`);
    if (!m.Descripcion) errores.push(`${n}: falta la descripción.`);
    if (!(m.Cantidad > 0)) errores.push(`${n}: la cantidad debe ser mayor a 0.`);
    if (!m.ClaveUnidad) errores.push(`${n}: falta la ClaveUnidad.`);
    if (!(m.PesoEnKg > 0)) errores.push(`${n}: el peso en kg debe ser mayor a 0.`);
    if (m.MaterialPeligroso === 'Sí') {
      hayMaterialPeligroso = true;
      if (!m.CveMaterialPeligroso) errores.push(`${n}: falta CveMaterialPeligroso.`);
      if (!m.Embalaje) errores.push(`${n}: falta Embalaje del material peligroso.`);
    }
    (m.CantidadTransporta ?? []).forEach((ct, j) => {
      if (!ids.has(ct.IDOrigen) || !ids.has(ct.IDDestino)) {
        errores.push(`${n}, distribución ${j + 1}: IDOrigen/IDDestino no corresponde a una ubicación.`);
      }
    });
  });

  // --- Autotransporte ---
  const at = mercancias.Autotransporte;
  if (at) {
    if (!at.PermSCT || !at.NumPermisoSCT) errores.push('Autotransporte: faltan PermSCT y/o NumPermisoSCT.');
    const iv = at.IdentificacionVehicular;
    if (!iv.ConfigVehicular) errores.push('Autotransporte: falta ConfigVehicular.');
    if (!(iv.PesoBrutoVehicular > 0)) errores.push('Autotransporte: falta PesoBrutoVehicular.');
    if (!PATRONES_CP.placa.test(iv.PlacaVM)) errores.push('Autotransporte: PlacaVM inválida (solo letras y números).');
    if (!PATRONES_CP.anioModelo.test(String(iv.AnioModeloVM))) errores.push('Autotransporte: AnioModeloVM inválido.');
    if (!at.Seguros.AseguraRespCivil || !at.Seguros.PolizaRespCivil) {
      errores.push('Autotransporte: faltan aseguradora y póliza de responsabilidad civil.');
    }
    if (hayMaterialPeligroso && (!at.Seguros.AseguraMedAmbiente || !at.Seguros.PolizaMedAmbiente)) {
      errores.push('Autotransporte: con material peligroso se requiere seguro de medio ambiente.');
    }
    const rem = at.Remolques ?? [];
    if (rem.length > MAX_REMOLQUES) errores.push(`Autotransporte: máximo ${MAX_REMOLQUES} remolques.`);
    rem.forEach((r, i) => {
      if (!r.SubTipoRem || !PATRONES_CP.placa.test(r.Placa)) {
        errores.push(`Remolque ${i + 1}: falta SubTipoRem o la placa es inválida.`);
      }
    });
    if (!(Number(cp.TotalDistRec) > 0)) errores.push('Autotransporte: falta TotalDistRec.');
    if (!cp.FiguraTransporte.some(f => f.TipoFigura === '01')) {
      errores.push('Autotransporte: se requiere al menos un Operador (01) en FiguraTransporte.');
    }
  }

  // --- Figuras ---
  cp.FiguraTransporte.forEach((f, i) => {
    const n = `Figura ${i + 1}`;
    if (!f.NombreFigura) errores.push(`${n}: falta el nombre.`);
    if (f.TipoFigura === '01' && !f.NumLicencia) errores.push(`${n}: el operador requiere número de licencia.`);
    if (f.RFCFigura && !PATRONES_CP.rfc.test(f.RFCFigura)) errores.push(`${n}: RFC inválido.`);
  });

  return errores;
}
