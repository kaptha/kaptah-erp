/**
 * Contrato de un lector de paquetes.
 * Equivale a PackageReader/PackageReaderInterface.php.
 * Es asíncrono porque la descompresión con jszip lo es.
 */
export interface PackageReader {
  /** Recorre cada archivo del paquete: [nombre, contenido] */
  fileContents(): AsyncIterable<[string, string]>;
  count(): Promise<number>;
  readonly filename: string;
}
