/**
 * Genera el XML de un CFDI 4.0 con Complemento Carta Porte 3.1 (autotransporte)
 * a partir del JSON que produce el modal de Kaptah (nombres 1:1 con el XSD).
 *
 * - Respeta el orden de nodos del XSD (cfdv40.xsd y CartaPorte31.xsd).
 * - Formatea cada numero con los decimales que admite su tipo.
 * - Escapa los valores de atributos (&, <, >, ", ') y colapsa espacios.
 * - En Traslado (moneda XXX) los importes van sin decimales ("0").
 */
import {
  CfdiCartaPorte,
  ConceptoCP,
  ImpuestoConceptoCP,
  UbicacionCP,
  DomicilioCP,
  MercanciasCP,
  MercanciaCP,
  AutotransporteCP,
  TipoFiguraCP,
  CartaPorte31,
} from './carta-porte.model';

const NS_CFDI = 'http://www.sat.gob.mx/cfd/4';
const NS_CP31 = 'http://www.sat.gob.mx/CartaPorte31';
const SCHEMA_LOCATION =
  'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd ' +
  'http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd';

type Valor = string | number | null | undefined;

/** Escapa un valor para usarlo dentro de un atributo XML y colapsa espacios */
export function escaparAtributo(valor: Valor): string {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Numero con exactamente `decimales` decimales */
export function fijo(n: Valor, decimales: number): string {
  return (Number(n) || 0).toFixed(decimales);
}

/** Numero con hasta `decimales` decimales, sin ceros sobrantes (10.500 -> 10.5, 3.000 -> 3) */
export function hasta(n: Valor, decimales: number): string {
  const s = (Number(n) || 0).toFixed(decimales);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** Arma la lista de atributos omitiendo los vacios */
function attrs(pares: [string, Valor][]): string {
  return pares
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => ` ${k}="${escaparAtributo(v)}"`)
    .join('');
}

// ============================================================
// CFDI
// ============================================================

function conceptoXml(c: ConceptoCP, esTraslado: boolean): string {
  const importe = (n: Valor) => (esTraslado ? hasta(n, 0) : fijo(n, 2));
  const abre =
    `<cfdi:Concepto` +
    attrs([
      ['ClaveProdServ', c.ClaveProdServ],
      ['NoIdentificacion', c.NoIdentificacion],
      ['Cantidad', hasta(c.Cantidad, 6)],
      ['ClaveUnidad', c.ClaveUnidad],
      ['Unidad', c.Unidad],
      ['Descripcion', c.Descripcion],
      ['ValorUnitario', importe(c.ValorUnitario)],
      ['Importe', importe(c.Importe)],
      ['ObjetoImp', c.ObjetoImp],
    ]);

  const traslados = c.Impuestos?.Traslados || [];
  const retenciones = c.Impuestos?.Retenciones || [];
  if (traslados.length === 0 && retenciones.length === 0) return abre + '/>';

  const impuesto = (tag: string, i: ImpuestoConceptoCP) =>
    `<cfdi:${tag}` +
    attrs([
      ['Base', fijo(i.Base, 2)],
      ['Impuesto', i.Impuesto],
      ['TipoFactor', i.TipoFactor],
      ['TasaOCuota', i.TipoFactor === 'Exento' ? undefined : fijo(i.TasaOCuota, 6)],
      ['Importe', i.TipoFactor === 'Exento' ? undefined : fijo(i.Importe, 2)],
    ]) +
    '/>';

  let xml = abre + '><cfdi:Impuestos>';
  if (traslados.length) xml += '<cfdi:Traslados>' + traslados.map(t => impuesto('Traslado', t)).join('') + '</cfdi:Traslados>';
  if (retenciones.length) xml += '<cfdi:Retenciones>' + retenciones.map(r => impuesto('Retencion', r)).join('') + '</cfdi:Retenciones>';
  return xml + '</cfdi:Impuestos></cfdi:Concepto>';
}

/** Impuestos a nivel comprobante: Retenciones (por impuesto) y luego Traslados (por impuesto/factor/tasa) */
function impuestosComprobanteXml(conceptos: ConceptoCP[]): string {
  const traslados = new Map<string, { base: number; importe: number; impuesto: string; factor: string; tasa: number }>();
  const retenciones = new Map<string, number>();

  for (const c of conceptos) {
    for (const t of c.Impuestos?.Traslados || []) {
      const k = `${t.Impuesto}|${t.TipoFactor}|${fijo(t.TasaOCuota, 6)}`;
      const acc = traslados.get(k) || { base: 0, importe: 0, impuesto: t.Impuesto, factor: t.TipoFactor, tasa: Number(t.TasaOCuota) || 0 };
      acc.base += Number(fijo(t.Base, 2));
      acc.importe += Number(fijo(t.Importe, 2));
      traslados.set(k, acc);
    }
    for (const r of c.Impuestos?.Retenciones || []) {
      retenciones.set(r.Impuesto, (retenciones.get(r.Impuesto) || 0) + Number(fijo(r.Importe, 2)));
    }
  }
  if (traslados.size === 0 && retenciones.size === 0) return '';

  const totalRet = [...retenciones.values()].reduce((a, b) => a + b, 0);
  const totalTras = [...traslados.values()].filter(t => t.factor !== 'Exento').reduce((a, t) => a + t.importe, 0);

  let xml =
    '<cfdi:Impuestos' +
    attrs([
      ['TotalImpuestosRetenidos', retenciones.size ? fijo(totalRet, 2) : undefined],
      ['TotalImpuestosTrasladados', traslados.size ? fijo(totalTras, 2) : undefined],
    ]) +
    '>';
  if (retenciones.size) {
    xml += '<cfdi:Retenciones>';
    retenciones.forEach((importe, imp) => (xml += `<cfdi:Retencion${attrs([['Impuesto', imp], ['Importe', fijo(importe, 2)]])}/>`));
    xml += '</cfdi:Retenciones>';
  }
  if (traslados.size) {
    xml += '<cfdi:Traslados>';
    traslados.forEach(t => {
      xml +=
        '<cfdi:Traslado' +
        attrs([
          ['Base', fijo(t.base, 2)],
          ['Impuesto', t.impuesto],
          ['TipoFactor', t.factor],
          ['TasaOCuota', t.factor === 'Exento' ? undefined : fijo(t.tasa, 6)],
          ['Importe', t.factor === 'Exento' ? undefined : fijo(t.importe, 2)],
        ]) +
        '/>';
    });
    xml += '</cfdi:Traslados>';
  }
  return xml + '</cfdi:Impuestos>';
}

// ============================================================
// Complemento Carta Porte 3.1
// ============================================================

function domicilioXml(d: DomicilioCP | undefined): string {
  if (!d) return '';
  return (
    '<cartaporte31:Domicilio' +
    attrs([
      ['Calle', d.Calle],
      ['NumeroExterior', d.NumeroExterior],
      ['NumeroInterior', d.NumeroInterior],
      ['Colonia', d.Colonia],
      ['Localidad', d.Localidad],
      ['Referencia', d.Referencia],
      ['Municipio', d.Municipio],
      ['Estado', d.Estado],
      ['Pais', d.Pais],
      ['CodigoPostal', d.CodigoPostal],
    ]) +
    '/>'
  );
}

function ubicacionXml(u: UbicacionCP): string {
  return (
    '<cartaporte31:Ubicacion' +
    attrs([
      ['TipoUbicacion', u.TipoUbicacion],
      ['IDUbicacion', u.IDUbicacion],
      ['RFCRemitenteDestinatario', u.RFCRemitenteDestinatario],
      ['NombreRemitenteDestinatario', u.NombreRemitenteDestinatario],
      ['NumRegIdTrib', u.NumRegIdTrib],
      ['ResidenciaFiscal', u.ResidenciaFiscal],
      ['FechaHoraSalidaLlegada', u.FechaHoraSalidaLlegada],
      ['DistanciaRecorrida', u.TipoUbicacion === 'Destino' && u.DistanciaRecorrida != null ? hasta(u.DistanciaRecorrida, 2) : undefined],
    ]) +
    '>' +
    domicilioXml(u.Domicilio) +
    '</cartaporte31:Ubicacion>'
  );
}

function mercanciaXml(m: MercanciaCP): string {
  const abre =
    '<cartaporte31:Mercancia' +
    attrs([
      ['BienesTransp', m.BienesTransp],
      ['ClaveSTCC', m.ClaveSTCC],
      ['Descripcion', m.Descripcion],
      ['Cantidad', hasta(m.Cantidad, 6)],
      ['ClaveUnidad', m.ClaveUnidad],
      ['Unidad', m.Unidad],
      ['Dimensiones', m.Dimensiones],
      ['MaterialPeligroso', m.MaterialPeligroso],
      ['CveMaterialPeligroso', m.MaterialPeligroso === 'Sí' ? m.CveMaterialPeligroso : undefined],
      ['Embalaje', m.MaterialPeligroso === 'Sí' ? m.Embalaje : undefined],
      ['DescripEmbalaje', m.MaterialPeligroso === 'Sí' ? m.DescripEmbalaje : undefined],
      ['PesoEnKg', hasta(m.PesoEnKg, 3)],
      ['ValorMercancia', m.ValorMercancia != null && Number(m.ValorMercancia) > 0 ? fijo(m.ValorMercancia, 2) : undefined],
      ['Moneda', m.ValorMercancia != null && Number(m.ValorMercancia) > 0 ? m.Moneda || 'MXN' : undefined],
      ['FraccionArancelaria', m.FraccionArancelaria],
      ['UUIDComercioExt', m.UUIDComercioExt],
      ['TipoMateria', m.TipoMateria],
      ['DescripcionMateria', m.DescripcionMateria],
    ]);

  const hijos =
    (m.DocumentacionAduanera || [])
      .map(d => '<cartaporte31:DocumentacionAduanera' + attrs([
        ['TipoDocumento', d.TipoDocumento],
        ['NumPedimento', d.NumPedimento],
        ['IdentDocAduanero', d.IdentDocAduanero],
        ['RFCImpo', d.RFCImpo],
      ]) + '/>')
      .join('') +
    (m.CantidadTransporta || [])
      .map(ct => '<cartaporte31:CantidadTransporta' + attrs([
        ['Cantidad', hasta(ct.Cantidad, 6)],
        ['IDOrigen', ct.IDOrigen],
        ['IDDestino', ct.IDDestino],
        ['CvesTransporte', ct.CvesTransporte],
      ]) + '/>')
      .join('');

  return hijos ? `${abre}>${hijos}</cartaporte31:Mercancia>` : `${abre}/>`;
}

function autotransporteXml(a: AutotransporteCP): string {
  const iv = a.IdentificacionVehicular;
  const sg = a.Seguros;
  let xml =
    '<cartaporte31:Autotransporte' + attrs([['PermSCT', a.PermSCT], ['NumPermisoSCT', a.NumPermisoSCT]]) + '>' +
    '<cartaporte31:IdentificacionVehicular' +
    attrs([
      ['ConfigVehicular', iv.ConfigVehicular],
      ['PesoBrutoVehicular', hasta(iv.PesoBrutoVehicular, 2)],
      ['PlacaVM', iv.PlacaVM],
      ['AnioModeloVM', iv.AnioModeloVM],
    ]) + '/>' +
    '<cartaporte31:Seguros' +
    attrs([
      ['AseguraRespCivil', sg.AseguraRespCivil],
      ['PolizaRespCivil', sg.PolizaRespCivil],
      ['AseguraMedAmbiente', sg.AseguraMedAmbiente],
      ['PolizaMedAmbiente', sg.PolizaMedAmbiente],
      ['AseguraCarga', sg.AseguraCarga],
      ['PolizaCarga', sg.PolizaCarga],
      ['PrimaSeguro', sg.PrimaSeguro != null && Number(sg.PrimaSeguro) > 0 ? fijo(sg.PrimaSeguro, 2) : undefined],
    ]) + '/>';
  if (a.Remolques && a.Remolques.length) {
    xml += '<cartaporte31:Remolques>' +
      a.Remolques.map(r => '<cartaporte31:Remolque' + attrs([['SubTipoRem', r.SubTipoRem], ['Placa', r.Placa]]) + '/>').join('') +
      '</cartaporte31:Remolques>';
  }
  return xml + '</cartaporte31:Autotransporte>';
}

function mercanciasXml(m: MercanciasCP): string {
  return (
    '<cartaporte31:Mercancias' +
    attrs([
      ['PesoBrutoTotal', hasta(m.PesoBrutoTotal, 3)],
      ['UnidadPeso', m.UnidadPeso],
      ['PesoNetoTotal', m.PesoNetoTotal != null && Number(m.PesoNetoTotal) > 0 ? hasta(m.PesoNetoTotal, 3) : undefined],
      ['NumTotalMercancias', m.NumTotalMercancias],
      ['CargoPorTasacion', m.CargoPorTasacion != null && Number(m.CargoPorTasacion) > 0 ? fijo(m.CargoPorTasacion, 2) : undefined],
      ['LogisticaInversaRecoleccionDevolucion', m.LogisticaInversaRecoleccionDevolucion],
    ]) +
    '>' +
    m.Mercancia.map(mercanciaXml).join('') +
    (m.Autotransporte ? autotransporteXml(m.Autotransporte) : '') +
    '</cartaporte31:Mercancias>'
  );
}

function figuraXml(f: TipoFiguraCP): string {
  const abre =
    '<cartaporte31:TiposFigura' +
    attrs([
      ['TipoFigura', f.TipoFigura],
      ['RFCFigura', f.RFCFigura],
      ['NumLicencia', f.NumLicencia],
      ['NombreFigura', f.NombreFigura],
      ['NumRegIdTribFigura', f.NumRegIdTribFigura],
      ['ResidenciaFiscalFigura', f.ResidenciaFiscalFigura],
    ]);
  const hijos =
    (f.PartesTransporte || []).map(p => '<cartaporte31:PartesTransporte' + attrs([['ParteTransporte', p.ParteTransporte]]) + '/>').join('') +
    domicilioXml(f.Domicilio);
  return hijos ? `${abre}>${hijos}</cartaporte31:TiposFigura>` : `${abre}/>`;
}

function cartaPorteXml(cp: CartaPorte31): string {
  let xml =
    '<cartaporte31:CartaPorte' +
    attrs([
      ['Version', '3.1'],
      ['IdCCP', cp.IdCCP],
      ['TranspInternac', cp.TranspInternac],
      ['EntradaSalidaMerc', cp.TranspInternac === 'Sí' ? cp.EntradaSalidaMerc : undefined],
      ['PaisOrigenDestino', cp.TranspInternac === 'Sí' ? cp.PaisOrigenDestino : undefined],
      ['ViaEntradaSalida', cp.TranspInternac === 'Sí' ? cp.ViaEntradaSalida : undefined],
      ['TotalDistRec', cp.TotalDistRec != null && Number(cp.TotalDistRec) > 0 ? hasta(cp.TotalDistRec, 2) : undefined],
      ['RegistroISTMO', cp.RegistroISTMO],
      ['UbicacionPoloOrigen', cp.UbicacionPoloOrigen],
      ['UbicacionPoloDestino', cp.UbicacionPoloDestino],
    ]) +
    '>';
  if (cp.TranspInternac === 'Sí' && cp.RegimenesAduaneros && cp.RegimenesAduaneros.length) {
    xml += '<cartaporte31:RegimenesAduaneros>' +
      cp.RegimenesAduaneros.map(r => '<cartaporte31:RegimenAduaneroCCP' + attrs([['RegimenAduanero', r.RegimenAduanero]]) + '/>').join('') +
      '</cartaporte31:RegimenesAduaneros>';
  }
  xml += '<cartaporte31:Ubicaciones>' + cp.Ubicaciones.map(ubicacionXml).join('') + '</cartaporte31:Ubicaciones>';
  xml += mercanciasXml(cp.Mercancias);
  if (cp.FiguraTransporte && cp.FiguraTransporte.length) {
    xml += '<cartaporte31:FiguraTransporte>' + cp.FiguraTransporte.map(figuraXml).join('') + '</cartaporte31:FiguraTransporte>';
  }
  return xml + '</cartaporte31:CartaPorte>';
}

// ============================================================
// Comprobante completo
// ============================================================

/**
 * @param cfdi  JSON del modal (CFDI 4.0 + CartaPorte 3.1)
 * @param fecha Fecha del comprobante en formato SAT (AAAA-MM-DDThh:mm:ss), la asigna el backend
 */
export function buildCartaPorteXml(cfdi: CfdiCartaPorte, fecha: string): string {
  const esTraslado = cfdi.TipoDeComprobante === 'T';
  const conceptos = cfdi.Conceptos || [];
  const importe = (n: Valor) => (esTraslado ? hasta(n, 0) : fijo(n, 2));

  const comprobante =
    `<cfdi:Comprobante xmlns:cfdi="${NS_CFDI}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"` +
    ` xmlns:cartaporte31="${NS_CP31}" xsi:schemaLocation="${SCHEMA_LOCATION}"` +
    attrs([
      ['Version', '4.0'],
      ['Serie', cfdi.Serie],
      ['Folio', cfdi.Folio],
      ['Fecha', fecha],
      ['FormaPago', esTraslado ? undefined : cfdi.FormaPago],
      ['SubTotal', importe(cfdi.SubTotal)],
      ['Descuento', !esTraslado && Number(cfdi.Descuento) > 0 ? fijo(cfdi.Descuento, 2) : undefined],
      ['Moneda', esTraslado ? 'XXX' : cfdi.Moneda || 'MXN'],
      ['Total', importe(cfdi.Total)],
      ['TipoDeComprobante', cfdi.TipoDeComprobante],
      ['Exportacion', cfdi.Exportacion || '01'],
      ['MetodoPago', esTraslado ? undefined : cfdi.MetodoPago],
      ['LugarExpedicion', cfdi.LugarExpedicion],
    ]) +
    '>';

  const emisor = '<cfdi:Emisor' + attrs([
    ['Rfc', cfdi.Emisor.Rfc],
    ['Nombre', cfdi.Emisor.Nombre],
    ['RegimenFiscal', cfdi.Emisor.RegimenFiscal],
  ]) + '/>';

  const receptor = '<cfdi:Receptor' + attrs([
    ['Rfc', cfdi.Receptor.Rfc],
    ['Nombre', cfdi.Receptor.Nombre],
    ['DomicilioFiscalReceptor', cfdi.Receptor.DomicilioFiscalReceptor],
    ['RegimenFiscalReceptor', cfdi.Receptor.RegimenFiscalReceptor],
    ['UsoCFDI', cfdi.Receptor.UsoCFDI],
  ]) + '/>';

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    comprobante +
    emisor +
    receptor +
    '<cfdi:Conceptos>' + conceptos.map(c => conceptoXml(c, esTraslado)).join('') + '</cfdi:Conceptos>' +
    (esTraslado ? '' : impuestosComprobanteXml(conceptos)) +
    '<cfdi:Complemento>' + cartaPorteXml(cfdi.Complemento.CartaPorte) + '</cfdi:Complemento>' +
    '</cfdi:Comprobante>'
  );
}
