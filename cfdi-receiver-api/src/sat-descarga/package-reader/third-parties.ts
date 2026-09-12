import { CsvReader } from './csv-reader';
import { ThirdPartiesFileFilter } from './file-filters';
import { FilteredPackageReader } from './filtered-package-reader';

export interface ThirdPartyValues {
  RfcACuentaTerceros: string;
  NombreACuentaTerceros: string;
}

/**
 * Índice UUID → RfcACuentaTerceros/NombreACuentaTerceros leído del archivo *_tercero.txt.
 * Equivale a Internal/ThirdPartiesRecords.php + ThirdPartiesExtractor.php.
 */
export class ThirdPartiesRecords {
  private constructor(private readonly records: Map<string, ThirdPartyValues>) {}

  static createEmpty(): ThirdPartiesRecords {
    return new ThirdPartiesRecords(new Map());
  }

  static async createFromPackageReader(reader: FilteredPackageReader): Promise<ThirdPartiesRecords> {
    const previous = reader.changeFilter(new ThirdPartiesFileFilter());
    let contents = '';
    try {
      for await (const [, fileContents] of reader.fileContents()) {
        contents = fileContents;
        break;
      }
    } finally {
      reader.setFilter(previous);
    }
    const records = new Map<string, ThirdPartyValues>();
    for (const data of CsvReader.createFromContents(contents).records()) {
      const uuid = (data.Uuid ?? '').toLowerCase();
      if (uuid === '') continue;
      records.set(uuid, {
        RfcACuentaTerceros: data.RfcACuentaTerceros ?? '',
        NombreACuentaTerceros: data.NombreACuentaTerceros ?? '',
      });
    }
    return new ThirdPartiesRecords(records);
  }

  get size(): number {
    return this.records.size;
  }

  getDataFromUuid(uuid: string): ThirdPartyValues {
    return this.records.get(uuid.toLowerCase()) ?? { RfcACuentaTerceros: '', NombreACuentaTerceros: '' };
  }

  addToData(data: Record<string, string>): Record<string, string> {
    return { ...data, ...this.getDataFromUuid(data.Uuid ?? '') };
  }
}
