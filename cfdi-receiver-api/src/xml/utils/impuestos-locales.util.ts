/**
 * Complemento implocal:ImpuestosLocales (p. ej. retención CEDULAR estatal o ISH).
 * Se lee directo del XML porque el parser general no procesa este complemento.
 */
export interface ImpuestoLocal {
  tipo: 'retencion' | 'traslado';
  impuesto: string;
  tasa: number;
  importe: number;
}

export interface ImpuestosLocalesResumen {
  retencionesLocales: number;
  trasladosLocales: number;
  detalle: ImpuestoLocal[] | null;
}

function atributo(etiqueta: string, nombre: string): string | undefined {
  const m = etiqueta.match(new RegExp(`\\s${nombre}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function numero(valor?: string): number {
  const n = parseFloat(valor ?? '');
  return Number.isFinite(n) ? n : 0;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function etiquetas(xml: string, nombre: string): string[] {
  const rx = new RegExp(`<[A-Za-z0-9_-]*:?${nombre}\\s[^>]*>`, 'g');
  const encontradas: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml)) !== null) {
    encontradas.push(m[0]);
  }
  return encontradas;
}

export function extraerImpuestosLocales(xml: string | null | undefined): ImpuestosLocalesResumen {
  const vacio: ImpuestosLocalesResumen = { retencionesLocales: 0, trasladosLocales: 0, detalle: null };
  if (!xml || xml.indexOf('ImpuestosLocales') < 0) {
    return vacio;
  }

  const cabecera = etiquetas(xml, 'ImpuestosLocales')[0];
  if (!cabecera) {
    return vacio;
  }

  const detalle: ImpuestoLocal[] = [
    ...etiquetas(xml, 'RetencionesLocales').map((e) => ({
      tipo: 'retencion' as const,
      impuesto: atributo(e, 'ImpLocRetenido') || '',
      tasa: numero(atributo(e, 'TasadeRetencion')),
      importe: numero(atributo(e, 'Importe'))
    })),
    ...etiquetas(xml, 'TrasladosLocales').map((e) => ({
      tipo: 'traslado' as const,
      impuesto: atributo(e, 'ImpLocTrasladado') || '',
      tasa: numero(atributo(e, 'TasadeTraslado')),
      importe: numero(atributo(e, 'Importe'))
    }))
  ];

  const suma = (tipo: ImpuestoLocal['tipo']) =>
    redondear(detalle.filter((d) => d.tipo === tipo).reduce((s, d) => s + d.importe, 0));

  const totalRet = atributo(cabecera, 'TotaldeRetenciones');
  const totalTras = atributo(cabecera, 'TotaldeTraslados');

  return {
    retencionesLocales: totalRet !== undefined ? redondear(numero(totalRet)) : suma('retencion'),
    trasladosLocales: totalTras !== undefined ? redondear(numero(totalTras)) : suma('traslado'),
    detalle: detalle.length ? detalle : null
  };
}