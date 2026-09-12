/**
 * Extrae el UUID del TimbreFiscalDigital de un CFDI. Devuelve '' si no lo encuentra.
 * Equivale a CfdiPackageReader::obtainUuidFromXmlCfdi().
 */
const PATTERN = /:Complemento[\s\S]*?:TimbreFiscalDigital[\s\S]*?UUID="(?<uuid>[-a-zA-Z0-9]{36})"/;

export function obtainUuidFromXmlCfdi(xmlContent: string): string {
  const m = PATTERN.exec(xmlContent);
  return m?.groups?.uuid ? m.groups.uuid.toLowerCase() : '';
}
