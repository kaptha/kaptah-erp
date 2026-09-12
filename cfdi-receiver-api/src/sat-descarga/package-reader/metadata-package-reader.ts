import { MetadataFileFilter } from './file-filters';
import { FilteredPackageReader } from './filtered-package-reader';
import { MetadataContent } from './metadata-content';
import { MetadataItem } from './metadata-item';
import { PackageReader } from './package-reader.interface';
import { ThirdPartiesRecords } from './third-parties';

/**
 * Lee un paquete de Metadata: itera MetadataItem por UUID.
 * Equivale a PackageReader/MetadataPackageReader.php.
 */
export class MetadataPackageReader implements PackageReader {
  private constructor(
    private readonly reader: FilteredPackageReader,
    readonly thirdParties: ThirdPartiesRecords,
  ) {}

  static async createFromFile(filename: string): Promise<MetadataPackageReader> {
    return MetadataPackageReader.wrap(await FilteredPackageReader.createFromFile(filename));
  }

  static async createFromContents(content: Buffer, filename?: string): Promise<MetadataPackageReader> {
    return MetadataPackageReader.wrap(await FilteredPackageReader.createFromContents(content, filename));
  }

  private static async wrap(reader: FilteredPackageReader): Promise<MetadataPackageReader> {
    const thirdParties = await ThirdPartiesRecords.createFromPackageReader(reader);
    reader.setFilter(new MetadataFileFilter());
    return new MetadataPackageReader(reader, thirdParties);
  }

  get filename(): string {
    return this.reader.filename;
  }

  /** Recorre todos los renglones de metadata: [uuid, item] */
  async *metadata(): AsyncIterable<[string, MetadataItem]> {
    for await (const [, contents] of this.reader.fileContents()) {
      for (const item of MetadataContent.createFromContents(contents, this.thirdParties).eachItem()) {
        yield [item.uuid, item];
      }
    }
  }

  /** Conveniencia: todos los items en un arreglo (ojo con paquetes enormes) */
  async toArray(): Promise<MetadataItem[]> {
    const out: MetadataItem[] = [];
    for await (const [, item] of this.metadata()) out.push(item);
    return out;
  }

  fileContents(): AsyncIterable<[string, string]> {
    return this.reader.fileContents();
  }

  async count(): Promise<number> {
    let n = 0;
    for await (const _ of this.metadata()) n++;
    return n;
  }
}
