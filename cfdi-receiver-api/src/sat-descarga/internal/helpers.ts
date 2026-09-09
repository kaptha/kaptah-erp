/**
 * Utilidades internas del módulo.
 * Equivale a Internal/Helpers.php.
 */

/**
 * Elimina espacios al inicio de línea y saltos de línea, dejando la
 * declaración XML en su propia línea. Se usa para compactar los templates SOAP.
 */
export function nospaces(input: string): string {
  return input
    .replace(/^[ \t]*/gm, '') // A: espacios al inicio de línea
    .replace(/[ \t]*\r?\n/g, '') // B: espacios + CR opcional + LF
    .replace(/\?></g, '?>\n<'); // C: declaración xml en su propia línea
}

/** Quita las líneas -----BEGIN/END----- y saltos de un PEM, dejando solo el base64 */
export function cleanPemContents(pemContents: string): string {
  return pemContents
    .split('\n')
    .filter((line) => !line.startsWith('-----'))
    .map((line) => line.trim())
    .join('');
}
