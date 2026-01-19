import * as fs from 'fs';
import * as path from 'path';

const certPath = path.join(process.cwd(), 'resources', 'certificates', 'certificado.cer');
const keyPath = path.join(process.cwd(), 'resources', 'certificates', 'llave.key');

const certBuffer = fs.readFileSync(certPath);
const keyBuffer = fs.readFileSync(keyPath);

console.log('Certificado primeros bytes:', certBuffer.slice(0, 16).toString('hex'));
console.log('Llave primeros bytes:', keyBuffer.slice(0, 16).toString('hex'));