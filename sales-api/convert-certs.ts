import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const certDir = path.join(process.cwd(), 'resources', 'certificates');
const originalCert = path.join(certDir, 'certificado.cer');
const originalKey = path.join(certDir, 'llave.key');
const convertedCert = path.join(certDir, 'certificado.pem');
const convertedKey = path.join(certDir, 'llave.pem');

try {
  // Convertir certificado
  console.log('Convirtiendo certificado...');
  execSync(`openssl x509 -inform DER -outform PEM -in "${originalCert}" -out "${convertedCert}"`);
  
  // Convertir llave privada
  console.log('Convirtiendo llave privada...');
  execSync(`openssl pkcs8 -inform DER -in "${originalKey}" -out "${convertedKey}" -passin pass:12345678a`);
  
  // Verificar contenido
  console.log('\nContenido del certificado convertido:');
  console.log(fs.readFileSync(convertedCert, 'utf8'));
  
  console.log('\nContenido de la llave convertida:');
  console.log(fs.readFileSync(convertedKey, 'utf8'));
  
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout.toString());
  if (error.stderr) console.log('Stderr:', error.stderr.toString());
}