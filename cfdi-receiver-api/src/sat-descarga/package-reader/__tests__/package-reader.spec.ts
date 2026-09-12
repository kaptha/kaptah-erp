import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CfdiPackageReader } from '../cfdi-package-reader';
import { obtainUuidFromXmlCfdi } from '../cfdi-uuid';
import { CsvReader, combine } from '../csv-reader';
import { CfdiFileFilter, MetadataFileFilter, ThirdPartiesFileFilter } from '../file-filters';
import { FilteredPackageReader } from '../filtered-package-reader';
import { MetadataContent } from '../metadata-content';
import { MetadataPackageReader } from '../metadata-package-reader';
import { fixMetadataContents } from '../metadata-preprocessor';
import { OpenZipFileError } from '../package-reader.errors';

const F = join(__dirname, '_files');
const file = (n: string) => readFileSync(join(F, n));

describe('obtainUuidFromXmlCfdi', () => {
  it('extrae el UUID del TimbreFiscalDigital en minúsculas', () => {
    const xml = file('cfdi.xml').toString('utf8');
    expect(obtainUuidFromXmlCfdi(xml)).toMatch(/^[0-9a-f-]{36}$/);
    expect(obtainUuidFromXmlCfdi('<cfdi:Comprobante/>')).toBe('');
  });
});

describe('filtros', () => {
  it('CfdiFileFilter solo acepta .xml en raíz con timbre', () => {
    const f = new CfdiFileFilter();
    expect(f.filterFilename('a.xml')).toBe(true);
    expect(f.filterFilename('__MACOSX/a.xml')).toBe(false);
    expect(f.filterFilename('a.txt')).toBe(false);
    expect(f.filterContents(file('cfdi.xml').toString())).toBe(true);
    expect(f.filterContents('<x/>')).toBe(false);
  });

  it('MetadataFileFilter y ThirdPartiesFileFilter distinguen por encabezado', () => {
    const m = new MetadataFileFilter();
    const t = new ThirdPartiesFileFilter();
    expect(m.filterFilename('X_01.txt')).toBe(true);
    expect(m.filterContents('Uuid~RfcEmisor~Nombre')).toBe(true);
    expect(m.filterContents('Uuid~RfcACuentaTerceros~')).toBe(false);
    expect(t.filterFilename('X_tercero.txt')).toBe(true);
    expect(t.filterFilename('X_01.txt')).toBe(false);
    expect(t.filterContents('Uuid~RfcACuentaTerceros~Nombre')).toBe(true);
  });
});

describe('CsvReader', () => {
  it('combina encabezados y valores, rellena faltantes y nombra sobrantes', () => {
    expect(combine(['a', 'b'], ['1'])).toEqual({ a: '1', b: '' });
    expect(combine(['a'], ['1', '2', '3'])).toEqual({ a: '1', '#extra-01': '2', '#extra-02': '3' });
  });

  it('lee registros con separador ~, ignora vacías y quita encierro |', () => {
    const rows = [...CsvReader.createFromContents('A~B\n\n|x|~y\r\n1~2\n').records()];
    expect(rows).toEqual([{ A: 'x', B: 'y' }, { A: '1', B: '2' }]);
    expect([...CsvReader.createFromContents('').records()]).toEqual([]);
  });
});

describe('fixMetadataContents', () => {
  it('quita LF sueltos solo cuando el EOL es CRLF', () => {
    expect(fixMetadataContents('A~B\r\n1~x\ny\r\n')).toBe('A~B\n1~xy\n');
    expect(fixMetadataContents('A~B\n1~x\ny\n')).toBe('A~B\n1~x\ny\n');
  });
});

describe('FilteredPackageReader', () => {
  it('rechaza contenido que no es ZIP', async () => {
    await expect(FilteredPackageReader.createFromContents(Buffer.from('no zip'))).rejects.toBeInstanceOf(OpenZipFileError);
  });

  it('sin filtro lista todos los archivos (no directorios)', async () => {
    const r = await FilteredPackageReader.createFromContents(file('metadata.zip'));
    const names: string[] = [];
    for await (const [name] of r.fileContents()) names.push(name);
    expect(names).toContain('other.txt');
    expect(names.some((n) => n.endsWith('/'))).toBe(false);
  });
});

describe('MetadataPackageReader', () => {
  it('lee metadata.zip y coincide con metadata.json', async () => {
    const r = await MetadataPackageReader.createFromContents(file('metadata.zip'), 'metadata.zip');
    const expected = JSON.parse(file('metadata.json').toString('utf8')) as Record<string, Record<string, string>>;
    const got: Record<string, Record<string, string>> = {};
    for await (const [uuid, item] of r.metadata()) got[uuid] = item.toJSON();
    expect(got).toEqual(expected);
    expect(await r.count()).toBe(Object.keys(expected).length);
    expect(r.filename).toBe('metadata.zip');
  });

  it('expone getters tipados y estado', async () => {
    const r = await MetadataPackageReader.createFromContents(file('metadata.zip'));
    const [first] = await r.toArray();
    expect(first.rfcEmisor).toBe('XAXX010101000');
    expect(first.monto).toBe('1124.11');
    expect(first.efectoComprobante).toBe('I');
    expect(first.isVigente()).toBe(true);
    expect(first.isCancelado()).toBe(false);
  });

  it('mezcla el archivo _tercero.txt por UUID sin importar mayúsculas', async () => {
    const r = await MetadataPackageReader.createFromContents(file('metadata-terceros.zip'));
    expect(r.thirdParties.size).toBe(3);
    const items = await r.toArray();
    const byUuid = Object.fromEntries(items.map((i) => [i.uuid.toLowerCase(), i]));
    expect(byUuid['11111111-aaaa-bbbb-0000-000000000002'].rfcACuentaTerceros).toBe('AAAA010101AA1');
    expect(byUuid['11111111-aaaa-bbbb-0000-000000000003'].nombreACuentaTerceros).toBe('PERSONA FISICA DOS');
    expect(byUuid['11111111-aaaa-bbbb-0000-000000000001'].rfcACuentaTerceros).toBe('');
  });
});

describe('CfdiPackageReader', () => {
  it('lee cfdi.zip ignorando __MACOSX, vacíos y no-CFDI', async () => {
    const r = await CfdiPackageReader.createFromContents(file('cfdi.zip'));
    const all: Array<[string, string]> = [];
    for await (const entry of r.cfdis()) all.push(entry);
    expect(all.length).toBe(2); // aaaa….xml y aaaa….xml.xml (mismo contenido); el 0000… no tiene timbre
    expect(all.every(([uuid]) => uuid === '11111111-2222-3333-4444-000000000001')).toBe(true);
    expect(all[0][1]).toBe(file('cfdi.xml').toString('utf8'));
    expect(await r.count()).toBe(2);
  });
});
