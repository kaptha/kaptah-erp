/**
 * Lector del "CSV" del SAT: separador ~, encierro |, sin escape real.
 * Equivale a PackageReader/Internal/CsvReader.php (SplTempFileObject::READ_CSV con '~', '|', '\\').
 */
export type CsvRecord = Record<string, string>;

export class CsvReader {
  private constructor(private readonly lines: string[]) {}

  static createFromContents(contents: string): CsvReader {
    if (contents === '') return new CsvReader([]);
    return new CsvReader(contents.split('\n'));
  }

  *records(): Generator<CsvRecord> {
    let headers: string[] = [];
    for (const raw of this.lines) {
      const line = raw.replace(/\r$/, '');
      if (line === '') continue;
      const data = parseLine(line);
      if (headers.length === 0) {
        headers = data;
        continue;
      }
      yield combine(headers, data);
    }
  }
}

/** Separa por ~ y quita el encierro | si el campo viene entre barras */
function parseLine(line: string): string[] {
  return line.split('~').map((v) => (v.length >= 2 && v.startsWith('|') && v.endsWith('|') ? v.slice(1, -1) : v));
}

/** Empareja encabezados y valores; rellena faltantes con '' y nombra sobrantes #extra-NN */
export function combine(keys: string[], values: string[]): CsvRecord {
  const k = [...keys];
  const v = [...values];
  while (v.length < k.length) v.push('');
  for (let i = 1; v.length > k.length; i++) k.push(`#extra-${i.toString().padStart(2, '0')}`);
  const out: CsvRecord = {};
  k.forEach((key, i) => { out[key] = v[i]; });
  return out;
}
