export const SIFEI_ERROR_MAP: Record<string, { titulo: string; mensaje: string; campo?: string }> = {
  'CFDI40102': {
    titulo: 'Error en el Sello Digital',
    mensaje: 'El sello del CFDI no coincide con la cadena original. Intente de nuevo o contacte soporte.',
  },
  'CFDI40139': {
    titulo: 'Nombre del Emisor Incorrecto',
    mensaje: 'El nombre del emisor no coincide con el registrado en el SAT. Verifique que sea exactamente igual al de su Constancia de Situación Fiscal.',
    campo: 'emisor.nombre',
  },
  'CFDI40161': {
    titulo: 'Uso de CFDI Incompatible',
    mensaje: 'El Uso de CFDI seleccionado no es compatible con el régimen fiscal del receptor. Cambie el Uso de CFDI a "S01 - Sin efectos fiscales" o verifique el régimen fiscal del cliente.',
    campo: 'receptor.usoCFDI',
  },
  '401': {
    titulo: 'Fecha del Comprobante',
    mensaje: 'La fecha del comprobante es posterior o muy anterior a la fecha actual. Intente de nuevo.',
  },
  'CFDI40148': {
    titulo: 'RFC del Receptor Inválido',
    mensaje: 'El RFC del receptor no está registrado en el SAT o no es válido. Verifique los datos del cliente.',
    campo: 'receptor.rfc',
  },
  'CFDI40149': {
    titulo: 'Nombre del Receptor Incorrecto',
    mensaje: 'El nombre del receptor no coincide con el registrado en el SAT. Verifique que sea exactamente igual al de la Constancia de Situación Fiscal del cliente.',
    campo: 'receptor.nombre',
  },
  'CFDI40150': {
    titulo: 'Régimen Fiscal del Receptor',
    mensaje: 'El régimen fiscal del receptor no corresponde con el registrado en el SAT. Verifique los datos del cliente.',
    campo: 'receptor.regimenFiscal',
  },
  'CFDI40152': {
    titulo: 'Domicilio Fiscal del Receptor',
    mensaje: 'El código postal del domicilio fiscal del receptor no corresponde con el registrado en el SAT.',
    campo: 'receptor.domicilioFiscal',
  },
};

export function traducirErrorSifei(codigoOrMessage: string): { titulo: string; mensaje: string; campo?: string; codigo?: string } {
  // Buscar código en el mensaje
  const codeMatch = codigoOrMessage.match(/CFDI\d+|\b40\d\b/);
  const codigo = codeMatch ? codeMatch[0] : null;

  if (codigo && SIFEI_ERROR_MAP[codigo]) {
    return { ...SIFEI_ERROR_MAP[codigo], codigo };
  }

  // Buscar por texto clave
  if (codigoOrMessage.includes('nombre del emisor')) {
    return { ...SIFEI_ERROR_MAP['CFDI40139'], codigo: 'CFDI40139' };
  }
  if (codigoOrMessage.includes('UsoCFDI')) {
    return { ...SIFEI_ERROR_MAP['CFDI40161'], codigo: 'CFDI40161' };
  }
  if (codigoOrMessage.includes('fecha')) {
    return { ...SIFEI_ERROR_MAP['401'], codigo: '401' };
  }

  return {
    titulo: 'Error de Timbrado',
    mensaje: 'Ocurrió un error al timbrar el CFDI. Verifique los datos e intente de nuevo.',
    codigo: codigo || 'DESCONOCIDO',
  };
}