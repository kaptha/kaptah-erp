import { readFile } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import { FileFilter, NullFileFilter } from './file-filters';
import { PackageReader } from './package-reader.interface';
import { OpenZipFileError } from './package-reader.errors';

/**
 * Lector de ZIP con filtro por nombre y contenido.
 * Equivale a PackageReader/Internal/FilteredPackageReader.php.
 * Usa adm-zip (ya presente en cfdi-receiver-api); descomprime entrada por entrada
 * bajo demanda. La interfaz es async para no atar al resto del módulo a la librería.
 */
export class FilteredPackageReader implements PackageReader {
  private filter: FileFilter = new NullFileFilter();

  private constructor(
    readonly filename: string,
    private readonly archive: AdmZip,
  ) {}

  static async createFromFile(filename: string): Promise<FilteredPackageReader> {
    let content: Buffer;
    try {
      content = await readFile(filename);
    } catch (error) {
      throw new OpenZipFileError(`No se puede leer el archivo ${filename}`, error);
    }
    return FilteredPackageReader.createFromContents(content, filename);
  }

  static async createFromContents(content: Buffer, filename = '(memoria)'): Promise<FilteredPackageReader> {
    try {
      const archive = new AdmZip(content);
      archive.getEntries(); // fuerza la lectura del directorio central; lanza si no es ZIP
      return new FilteredPackageReader(filename, archive);
    } catch (error) {
      throw new OpenZipFileError(`El contenido no es un ZIP válido (${filename})`, error);
    }
  }

  async *fileContents(): AsyncIterable<[string, string]> {
    const entries = [...this.archive.getEntries()].sort((a, b) => a.entryName.localeCompare(b.entryName));
    for (const entry of entries) {
      const name = entry.entryName;
      if (entry.isDirectory || !this.filter.filterFilename(name)) continue;
      const contents = entry.getData().toString('utf8');
      if (!this.filter.filterContents(contents)) continue;
      yield [name, contents];
    }
  }

  async count(): Promise<number> {
    let n = 0;
    for await (const _ of this.fileContents()) n++;
    return n;
  }

  getFilter(): FileFilter {
    return this.filter;
  }

  setFilter(filter: FileFilter): void {
    this.filter = filter;
  }

  /** Cambia el filtro y devuelve el anterior, para restaurarlo */
  changeFilter(filter: FileFilter): FileFilter {
    const previous = this.filter;
    this.filter = filter;
    return previous;
  }
}
