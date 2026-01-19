import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CertVaultClientService, CsdCertificate } from './cert-vault-client.service';

const execPromise = promisify(exec);

@Injectable()
export class SignService {
  private readonly logger = new Logger(SignService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly certVaultClient: CertVaultClientService,
  ) {
    this.logger.log('SignService inicializado con certificados dinámicos');
  }

  /**
   * Firma una cadena original usando el certificado CSD del usuario
   * @param originalString Cadena original a firmar
   * @param firebaseToken Token de Firebase para obtener certificado del usuario
   * @returns Sello digital en Base64
   */
 async sign(originalString: string, firebaseToken: string, password: string): Promise<string> {
  try {
    this.logger.debug('Iniciando proceso de firma con OpenSSL (certificados dinámicos)');
    this.logger.debug(`Longitud cadena original: ${originalString.length} caracteres`);

    // ⭐ PASO 1: Obtener certificado CSD del usuario (SIN contraseña)
    const csdCert = await this.certVaultClient.getActiveCsd(firebaseToken);
    this.logger.debug(`Certificado obtenido - Número: ${csdCert.certificateNumber}`);
    
    // ⭐ PASO 2: Usar la contraseña proporcionada por el usuario
    // NO obtenerla de la base de datos
    const keyPassword = password; // ⭐ Usar el parámetro recibido
    this.logger.debug('✅ Usando contraseña proporcionada por el usuario');
    
    // Crear carpeta temporal
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const userId = csdCert.userId;
    const cadenaPath = path.join(tempDir, `cadena_${userId}_${timestamp}.txt`);
    const keyPemPath = path.join(tempDir, `key_${userId}_${timestamp}.pem`);
    const selloPath = path.join(tempDir, `sello_${userId}_${timestamp}.bin`);
    const selloBase64Path = path.join(tempDir, `sello_${userId}_${timestamp}.txt`);
    
    // PASO 3: Guardar la cadena original en archivo temporal
    await fs.promises.writeFile(cadenaPath, originalString, { 
      encoding: 'utf8',
      flag: 'w'
    });
    
    // PASO 4: Guardar la llave privada PEM en archivo temporal
    await fs.promises.writeFile(keyPemPath, csdCert.keyPem, {
      encoding: 'utf8',
      flag: 'w'
    });
    
    try {
      // PASO 5: Firmar con SHA-256 (CFDI 4.0)
      const signCommand = `openssl dgst -sha256 -sign "${keyPemPath}" -passin pass:${keyPassword} -out "${selloPath}" "${cadenaPath}"`;
      await execPromise(signCommand);
      this.logger.debug('✅ Cadena firmada exitosamente');
      
      // PASO 6: Convertir a Base64 sin saltos de línea (-A)
      const base64Command = `openssl base64 -in "${selloPath}" -out "${selloBase64Path}" -A`;
      await execPromise(base64Command);
      this.logger.debug('✅ Convertido a Base64');
      
      // PASO 7: Leer el sello y limpiar espacios
      let sello = await fs.promises.readFile(selloBase64Path, 'utf8');
      sello = sello.replace(/\s/g, '');
      
      this.logger.debug(`Sello generado: ${sello.substring(0, 80)}...`);
      this.logger.debug(`Longitud del sello: ${sello.length} caracteres`);
      
      return sello;
    } finally {
      // PASO 8: Limpiar archivos temporales
      await this.cleanupTempFiles([
        cadenaPath,
        keyPemPath,
        selloPath,
        selloBase64Path
      ]);
    }
  } catch (error) {
    this.logger.error('❌ Error firmando con certificado dinámico:', error);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    throw new HttpException(
      `Error generando sello digital: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  /**
   * ⭐ ACTUALIZADO: Obtiene información del certificado CSD del usuario
   * Convierte el número de certificado a formato decimal de 20 dígitos
   */
  async getCertificateInfo(firebaseToken: string): Promise<{ number: string; base64: string; }> {
    try {
      this.logger.debug('Obteniendo información del certificado CSD del usuario');
      
      // Obtener certificado del cert-vault-service
      const csdCert = await this.certVaultClient.getActiveCsd(firebaseToken);
      
      this.logger.debug(`Certificado obtenido de BD: ${csdCert.certificateNumber}`);
      
      // ⭐ Convertir el número de certificado al formato correcto
      const noCertificadoDecimal = this.convertirNoCertificadoADecimal(
        csdCert.certificateNumber,
        csdCert.cerPem
      );
      
      this.logger.debug(`Certificado convertido: ${noCertificadoDecimal}`);
      this.logger.debug(`Certificado Base64 (primeros 50 chars): ${csdCert.cerBase64.substring(0, 50)}...`);
      
      return {
        number: noCertificadoDecimal,  // ⭐ Número en formato decimal de 20 dígitos
        base64: csdCert.cerBase64
      };
    } catch (error) {
      this.logger.error('Error obteniendo información del certificado:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Error obteniendo información del certificado',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * ⭐ NUEVO: Convierte el número de certificado al formato correcto
   * @param noCertificado Número de certificado (puede estar en hex o decimal)
   * @param cerPem Certificado PEM para extraer el serial number real
   * @returns Número de certificado en formato decimal de 20 dígitos
   */
  private convertirNoCertificadoADecimal(noCertificado: string, cerPem: string): string {
  try {
    // Parsear el certificado con forge
    const cert = forge.pki.certificateFromPem(cerPem);
    
    // Obtener el serial number en formato hexadecimal
    const serialHex = cert.serialNumber;
    
    this.logger.debug(`🔢 Serial Number (hex): ${serialHex}`);
    this.logger.debug(`🔢 Longitud hex: ${serialHex.length} caracteres`);
    
    // ⭐ CONVERTIR DE HEX A ASCII (no a decimal)
    // El SAT codifica el número como caracteres ASCII en hex
    // Ejemplo: "33" en hex = "3" en ASCII
    let noCertificadoAscii = '';
    
    for (let i = 0; i < serialHex.length; i += 2) {
      const hexByte = serialHex.substr(i, 2);
      const charCode = parseInt(hexByte, 16);
      
      // Solo agregar si es un dígito ASCII (0-9)
      if (charCode >= 48 && charCode <= 57) { // 48='0', 57='9'
        noCertificadoAscii += String.fromCharCode(charCode);
      }
    }
    
    this.logger.debug(`🔢 Número extraído (ASCII): ${noCertificadoAscii}`);
    this.logger.debug(`🔢 Longitud: ${noCertificadoAscii.length} dígitos`);
    
    // Asegurar 20 dígitos
    let noCertificadoFinal = noCertificadoAscii;
    
    if (noCertificadoFinal.length > 20) {
      // Si es más largo, tomar los primeros 20
      noCertificadoFinal = noCertificadoFinal.substring(0, 20);
      this.logger.debug(`🔢 Primeros 20 dígitos: ${noCertificadoFinal}`);
    } else if (noCertificadoFinal.length < 20) {
      // Si es más corto, rellenar con ceros a la izquierda
      noCertificadoFinal = noCertificadoFinal.padStart(20, '0');
      this.logger.debug(`🔢 Rellenado con ceros: ${noCertificadoFinal}`);
    }
    
    this.logger.debug(`🔢 Número de certificado FINAL: ${noCertificadoFinal}`);
    
    // Validar que sea exactamente 20 dígitos numéricos
    if (!/^\d{20}$/.test(noCertificadoFinal)) {
      throw new Error(`Número de certificado inválido: ${noCertificadoFinal}`);
    }
    
    return noCertificadoFinal;
    
  } catch (error) {
    this.logger.error('❌ Error convirtiendo número de certificado:', error);
    this.logger.error(`   Stack: ${error.stack}`);
    
    throw new HttpException(
      `Error procesando número de certificado: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  /**
   * Verifica que el sello sea válido usando el certificado público
   * @param originalString Cadena original que fue firmada
   * @param seal Sello generado
   * @param firebaseToken Token de Firebase para obtener certificado
   * @returns true si el sello es válido
   */
  async verifySeal(originalString: string, seal: string, firebaseToken: string): Promise<boolean> {
    try {
      // Obtener certificado público del usuario
      const csdCert = await this.certVaultClient.getActiveCsd(firebaseToken);
      
      // Convertir PEM a objeto de certificado
      const cert = forge.pki.certificateFromPem(csdCert.cerPem);
      const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
      
      // Crear hash SHA-256 de la cadena original
      const md = forge.md.sha256.create();
      md.update(originalString, 'utf8');
      
      // Decodificar el sello de Base64
      const signature = forge.util.decode64(seal);
      
      // Verificar la firma
      const verified = publicKey.verify(md.digest().bytes(), signature);
      
      if (verified) {
        this.logger.debug('✅ Sello verificado correctamente con el certificado');
      } else {
        this.logger.error('❌ El sello NO coincide con el certificado');
      }
      
      return verified;
    } catch (error) {
      this.logger.error('Error verificando sello:', error);
      throw new HttpException(
        'Error verificando sello digital',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Valida que el certificado CSD del usuario sea válido
   * @param firebaseToken Token de Firebase
   * @returns true si el certificado es válido
   */
  async validateCertificate(firebaseToken: string): Promise<boolean> {
    try {
      const csdCert = await this.certVaultClient.getActiveCsd(firebaseToken);
      
      // Verificar que no haya expirado
      const validUntil = new Date(csdCert.validUntil);
      const now = new Date();
      
      if (validUntil < now) {
        this.logger.warn(`Certificado expirado (válido hasta ${validUntil.toISOString()})`);
        return false;
      }
      
      // Verificar que ya sea válido
      const validFrom = new Date(csdCert.validFrom);
      if (validFrom > now) {
        this.logger.warn(`Certificado aún no es válido (válido desde ${validFrom.toISOString()})`);
        return false;
      }
      
      this.logger.debug('✅ Certificado CSD válido');
      return true;
    } catch (error) {
      this.logger.error('Error validando certificado:', error);
      return false;
    }
  }

  /**
   * Valida el par de llaves (certificado + llave privada)
   * @param firebaseToken Token de Firebase
   * @returns true si el par de llaves es válido
   */
  async validateKeyPair(firebaseToken: string): Promise<boolean> {
    try {
      const csdCert = await this.certVaultClient.getActiveCsd(firebaseToken);
      const keyPassword = await this.certVaultClient.getCsdPassword(firebaseToken);
      
      // Convertir PEM a objetos forge
      const cert = forge.pki.certificateFromPem(csdCert.cerPem);
      const privateKey = forge.pki.decryptRsaPrivateKey(csdCert.keyPem, keyPassword);
      
      if (!privateKey) {
        this.logger.error('No se pudo desencriptar la llave privada');
        return false;
      }
      
      // Verificar que la llave pública del certificado coincida con la llave privada
      const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
      
      // Crear un mensaje de prueba
      const testMessage = 'Test message for key pair validation';
      const md = forge.md.sha256.create();
      md.update(testMessage, 'utf8');
      
      // Firmar con la llave privada
      const signature = privateKey.sign(md);
      
      // Verificar con la llave pública
      const verified = publicKey.verify(md.digest().bytes(), signature);
      
      if (verified) {
        this.logger.debug('✅ Par de llaves validado correctamente');
      } else {
        this.logger.error('❌ El par de llaves NO es válido');
      }
      
      return verified;
    } catch (error) {
      this.logger.error('Error validando par de llaves:', error);
      return false;
    }
  }

  /**
   * Limpia archivos temporales de forma segura
   * @param filePaths Rutas de archivos a eliminar
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          this.logger.debug(`🗑️ Archivo temporal eliminado: ${path.basename(filePath)}`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Error eliminando archivo temporal ${filePath}:`, error.message);
      }
    }
  }
}