import { CsvReader } from './csv-reader';
import { MetadataItem } from './metadata-item';
import { fixMetadataContents } from './metadata-preprocessor';
import { ThirdPartiesRecords } from './third-parties';

/**
 * Convierte el texto de un archivo de metadata en MetadataItem.
 * Equivale a Internal/MetadataContent.php.
 */
export class MetadataContent {
  private constructor(
    private readonly csv: CsvReader,
    private readonly thirdParties: ThirdPartiesRecords,
  ) {}

  static createFromContents(contents: string, thirdParties: ThirdPartiesRecords = ThirdPartiesRecords.createEmpty()): MetadataContent {
    return new MetadataContent(CsvReader.createFromContents(fixMetadataContents(contents)), thirdParties);
  }

  *eachItem(): Generator<MetadataItem> {
    for (const data of this.csv.records()) {
      const merged = this.thirdParties.addToData(data);
      const lower: Record<string, string> = {};
      for (const [k, v] of Object.entries(merged)) {
        lower[k.charAt(0).toLowerCase() + k.slice(1)] = v;
      }
      yield new MetadataItem(lower);
    }
  }
}
