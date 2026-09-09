import { ComplementoCfdi } from '../complemento-cfdi';
import { DocumentStatus, documentStatusQueryValue } from '../document-status';
import { DocumentType } from '../document-type';
import { DownloadType } from '../download-type';
import { RequestType, requestTypeQueryValue } from '../request-type';
import { RfcMatch, RfcOnBehalf, isValidRfc } from '../rfc-filter';
import { RfcMatches } from '../rfc-matches';
import { Token } from '../token';
import { Uuid } from '../uuid';

describe('enums simples', () => {
  it('RequestType produce el atributo TipoSolicitud', () => {
    expect(requestTypeQueryValue(RequestType.Xml)).toBe('CFDI');
    expect(requestTypeQueryValue(RequestType.Metadata)).toBe('Metadata');
  });

  it('DownloadType guarda el nombre del atributo XML', () => {
    expect(DownloadType.Issued).toBe('RfcEmisor');
    expect(DownloadType.Received).toBe('RfcReceptor');
  });

  it('DocumentType usa las claves del SAT', () => {
    expect(DocumentType.Ingreso).toBe('I');
    expect(DocumentType.Pago).toBe('P');
    expect(DocumentType.Undefined).toBe('');
  });

  it('DocumentStatus produce el atributo EstadoComprobante', () => {
    expect(documentStatusQueryValue(DocumentStatus.Undefined)).toBe('Todos');
    expect(documentStatusQueryValue(DocumentStatus.Active)).toBe('Vigente');
    expect(documentStatusQueryValue(DocumentStatus.Cancelled)).toBe('Cancelado');
  });
});

describe('RfcMatch / RfcOnBehalf', () => {
  it('valida RFC de persona moral y física', () => {
    expect(isValidRfc('ABC010101AB1')).toBe(true);
    expect(isValidRfc('XAXX010101000')).toBe(true);
    expect(isValidRfc('MAGL850101AB1')).toBe(true);
    expect(isValidRfc('ABC')).toBe(false);
    expect(isValidRfc('')).toBe(false);
  });

  it('normaliza a mayúsculas y recorta espacios', () => {
    expect(RfcMatch.create(' xaxx010101000 ').value).toBe('XAXX010101000');
    expect(RfcOnBehalf.create('abc010101ab1').value).toBe('ABC010101AB1');
  });

  it('rechaza RFC inválido y permite vacío explícito', () => {
    expect(() => RfcMatch.create('INVALIDO')).toThrow();
    expect(RfcMatch.empty().isEmpty()).toBe(true);
    expect(JSON.stringify(RfcMatch.empty())).toBe('""');
  });
});

describe('RfcMatches', () => {
  it('descarta vacíos y duplicados', () => {
    const m = RfcMatches.createFromValues('XAXX010101000', '', 'xaxx010101000', 'ABC010101AB1');
    expect(m.count).toBe(2);
    expect(m.first().value).toBe('XAXX010101000');
    expect(m.toJSON()).toEqual(['XAXX010101000', 'ABC010101AB1']);
  });

  it('es iterable y detecta vacío', () => {
    expect([...RfcMatches.empty()]).toEqual([]);
    expect(RfcMatches.empty().isEmpty()).toBe(true);
    expect(RfcMatches.empty().first().isEmpty()).toBe(true);
  });
});

describe('Uuid', () => {
  it('normaliza a minúsculas y valida formato', () => {
    const u = Uuid.create('E8F7A2B1-1234-4ABC-9DEF-0123456789AB');
    expect(u.value).toBe('e8f7a2b1-1234-4abc-9def-0123456789ab');
    expect(Uuid.check('no-es-uuid')).toBe(false);
    expect(() => Uuid.create('no-es-uuid')).toThrow();
    expect(Uuid.empty().isEmpty()).toBe(true);
  });
});

describe('Token', () => {
  const created = new Date('2026-09-07T10:00:00Z');
  const expires = new Date('2026-09-07T10:05:00Z');

  it('es válido antes de expirar e inválido después', () => {
    const t = new Token(created, expires, 'abc');
    expect(t.isValid(0, new Date('2026-09-07T10:04:00Z'))).toBe(true);
    expect(t.isValid(0, new Date('2026-09-07T10:06:00Z'))).toBe(false);
  });

  it('respeta el margen de seguridad', () => {
    const t = new Token(created, expires, 'abc');
    expect(t.isValid(90, new Date('2026-09-07T10:04:00Z'))).toBe(false);
  });

  it('empty() nunca es válido y rechaza expiración anterior a creación', () => {
    expect(Token.empty().isValid()).toBe(false);
    expect(() => new Token(expires, created, 'x')).toThrow();
  });

  it('serializa y rehidrata desde JSON (Redis)', () => {
    const t = new Token(created, expires, 'abc');
    const back = Token.fromJSON(JSON.stringify(t));
    expect(back.value).toBe('abc');
    expect(back.expires.getTime()).toBe(expires.getTime());
    expect(t.secondsToExpire(new Date('2026-09-07T10:04:30Z'))).toBe(30);
  });
});

describe('ComplementoCfdi', () => {
  it('crea por clave y por código SAT', () => {
    const c = ComplementoCfdi.create('nomina12');
    expect(c.value).toBe('nomina12');
    expect(c.label).toBe('Nómina 1.2');
    expect(ComplementoCfdi.fromSatCode('pagos20').key).toBe('recepcionPagos20');
    expect(ComplementoCfdi.fromSatCode('').isUndefined()).toBe(true);
  });

  it('undefined() tiene valor vacío y rechaza desconocidos', () => {
    expect(ComplementoCfdi.undefined().value).toBe('');
    expect(() => ComplementoCfdi.create('noExiste')).toThrow();
    expect(() => ComplementoCfdi.fromSatCode('noexiste')).toThrow();
  });

  it('expone 37 entradas para catálogo', () => {
    expect(ComplementoCfdi.entries()).toHaveLength(37);
    expect(ComplementoCfdi.entries().every((e) => e.value !== '')).toBe(true);
  });
});
