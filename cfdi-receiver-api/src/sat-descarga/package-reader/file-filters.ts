import { obtainUuidFromXmlCfdi } from './cfdi-uuid';

/** Equivale a PackageReader/Internal/FileFilters/*.php */
export interface FileFilter {
  filterFilename(filename: string): boolean;
  filterContents(contents: string): boolean;
}

export class NullFileFilter implements FileFilter {
  filterFilename(): boolean { return true; }
  filterContents(): boolean { return true; }
}

/** Archivos .xml en la raíz del ZIP que contienen un TimbreFiscalDigital */
export class CfdiFileFilter implements FileFilter {
  filterFilename(filename: string): boolean {
    return /^[^/\\]+\.xml/i.test(filename);
  }
  filterContents(contents: string): boolean {
    return obtainUuidFromXmlCfdi(contents) !== '';
  }
}

/** Archivos .txt en la raíz que empiezan con el encabezado de metadata */
export class MetadataFileFilter implements FileFilter {
  filterFilename(filename: string): boolean {
    return /^[^/\\]+\.txt/i.test(filename);
  }
  filterContents(contents: string): boolean {
    return contents.startsWith('Uuid~RfcEmisor~');
  }
}

/** Archivo *_tercero.txt (RfcACuentaTerceros por UUID) */
export class ThirdPartiesFileFilter implements FileFilter {
  filterFilename(filename: string): boolean {
    return /^[^/\\]+_tercero\.txt/i.test(filename);
  }
  filterContents(contents: string): boolean {
    return contents.startsWith('Uuid~RfcACuentaTerceros~');
  }
}
