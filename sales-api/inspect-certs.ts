import * as fs from 'fs';
import * as path from 'path';

const certPath = path.join(process.cwd(), 'resources', 'certificates', 'certificado.cer');
const keyPath = path.join(process.cwd(), 'resources', 'certificates', 'llave.key');

const certBuffer = fs.readFileSync(certPath);
const keyBuffer = fs.readFileSync(keyPath);

console.log('Certificado:');
console.log('Primeros 32 bytes:', certBuffer.slice(0, 32).toString('hex'));
console.log('Total bytes:', certBuffer.length);
console.log('\nLlave privada:');
console.log('Primeros 32 bytes:', keyBuffer.slice(0, 32).toString('hex'));
console.log('Total bytes:', keyBuffer.length);

// Intenta diferentes offsets para ver dónde comienza el certificado real
console.log('\nPosibles inicios de certificado:');
[0, 4, 8].forEach(offset => {
    console.log(`\nOffset ${offset}:`);
    console.log(certBuffer.slice(offset, offset + 32).toString('hex'));
});