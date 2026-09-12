import { obtainUuidFromXmlCfdi } from './cfdi-uuid';
import { CfdiFileFilter } from './file-filters';
import { FilteredPackageReader } from './filtered-package-reader';
import { PackageReader } from './package-reader.interface';

/**
 * Lee un paquete de CFDI: itera [uuid, xml].
 * Equivale a PackageReader/CfdiPackageReader.php.
 */
export class CfdiPackageReader implements PackageReader {
  private constructor(private readonly reader: FilteredPackageReader) {}

  static async createFromFile(filename: string): Promise<CfdiPackageReader> {
    const reader = await FilteredPackageReader.createFromFile(filename);
    reader.setFilter(new CfdiFileFilter());
    return new CfdiPackageReader(reader);
  }

  static async createFromContents(content: Buffer, filename?: string): Promise<CfdiPackageReader> {
    const reader = await FilteredPackageReader.createFromContents(content, filename);
    reader.setFilter(new CfdiFileFilter());
    return new CfdiPackageReader(reader);
  }

  static obtainUuidFromXmlCfdi = obtainUuidFromXmlCfdi;

  get filename(): string {
    return this.reader.filename;
  }

  /** Recorre los CFDI del paquete: [uuid en minúsculas, xml] */
  async *cfdis(): AsyncIterable<[string, string]> {
    for await (const [, xml] of this.reader.fileContents()) {
      yield [obtainUuidFromXmlCfdi(xml), xml];
    }
  }

  fileContents(): AsyncIterable<[string, string]> {
    return this.reader.fileContents();
  }

  async count(): Promise<number> {
    let n = 0;
    for await (const _ of this.cfdis()) n++;
    return n;
  }
}
