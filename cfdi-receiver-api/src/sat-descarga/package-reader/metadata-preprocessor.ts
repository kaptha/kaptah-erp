/**
 * Corrige errores conocidos del archivo de metadata del SAT:
 * cuando el EOL es CRLF, algunos valores traen LF sueltos que rompen las líneas.
 * Equivale a PackageReader/Internal/MetadataPreprocessor.php.
 */
export function fixMetadataContents(contents: string): string {
  const firstLf = contents.indexOf('\n');
  const eolIsCrLf = firstLf > 0 && contents[firstLf - 1] === '\r';
  if (!eolIsCrLf) return contents;
  return contents
    .split('\r\n')
    .map((line) => line.replace(/\n/g, ''))
    .join('\n');
}
