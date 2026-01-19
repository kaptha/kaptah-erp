import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class OpenSSLService {
  private readonly logger = new Logger(OpenSSLService.name);
  private readonly opensslPath: string;
  constructor() {
    // Ruta a OpenSSL (ajusta según dónde lo instalaste)
    this.opensslPath = 'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe';
  }
  
  async generateDigest(cadenaOriginal: string, keyPath: string, password: string): Promise<string> {
    try {
      // 1. Crear archivos temporales
      const tempDir = path.join(process.cwd(), 'temp');
      const cadenaPath = path.join(tempDir, `cadena_${Date.now()}.txt`);
      const keyPemPath = path.join(tempDir, `key_${Date.now()}.pem`);
      const digestPath = path.join(tempDir, `digest_${Date.now()}.txt`);
      const sealPath = path.join(tempDir, `seal_${Date.now()}.txt`);
  
      // Asegurar que existe el directorio temp
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
  
      // 2. Guardar cadena original en archivo
      await fs.promises.writeFile(cadenaPath, cadenaOriginal, 'utf8');
      this.logger.debug(`Cadena original guardada en: ${cadenaPath}`);
  
      // 3. Convertir llave privada a formato PEM
      const command1 = `openssl pkcs8 -inform DER -in "${keyPath}" -passin pass:${password} -out "${keyPemPath}"`;
      await execAsync(command1);
      this.logger.debug(`Llave privada convertida a PEM en: ${keyPemPath}`);
  
      // 4. Paso I: Generar SHA-256 de la cadena original
      const command2 = `openssl dgst -sha256 -sign "${keyPemPath}" -out "${digestPath}" "${cadenaPath}"`;
      await execAsync(command2);
      this.logger.debug(`Digestión SHA-256 generada en: ${digestPath}`);
  
      // 5. Paso III: Convertir a Base64
      // Nota: El paso II (encriptación RSA) ya está incluido en el comando anterior
      const command3 = `openssl enc -base64 -in "${digestPath}" -out "${sealPath}" -A`;
      await execAsync(command3);
      this.logger.debug(`Sello en Base64 generado en: ${sealPath}`);
  
      // 6. Leer el sello
      const seal = await fs.promises.readFile(sealPath, 'utf8');
      this.logger.debug(`Sello leído: ${seal.trim()}`);
  
      // 7. Limpiar archivos temporales
      fs.unlinkSync(cadenaPath);
      fs.unlinkSync(keyPemPath);
      fs.unlinkSync(digestPath);
      fs.unlinkSync(sealPath);
  
      return seal.trim();
    } catch (error) {
      this.logger.error(`Error generando sello con OpenSSL: ${error.message}`);
      throw new Error(`Error generando sello: ${error.message}`);
    }
  }

  async generateCadenaOriginal(xmlContent: string): Promise<string> {
    try {
      // Guardar XML en archivo temporal
      const tempXmlPath = path.join(process.cwd(), 'temp', `temp_${Date.now()}.xml`);
      await fs.promises.writeFile(tempXmlPath, xmlContent, 'utf8');
      
      // Extraer datos del XML para formar la cadena original
      // Esto simula lo que haría xsltproc
      const { DOMParser } = require('@xmldom/xmldom');
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Construcción manual de la cadena original según reglas del SAT
      const comp = doc.documentElement;
      
      // Extraer atributos principales
      const version = comp.getAttribute('Version') || '';
      const serie = comp.getAttribute('Serie') || '';
      const folio = comp.getAttribute('Folio') || '';
      const fecha = comp.getAttribute('Fecha') || '';
      const formaPago = comp.getAttribute('FormaPago') || '';
      const subTotal = comp.getAttribute('SubTotal') || '';
      const moneda = comp.getAttribute('Moneda') || '';
      const total = comp.getAttribute('Total') || '';
      const tipoDeComprobante = comp.getAttribute('TipoDeComprobante') || '';
      const exportacion = comp.getAttribute('Exportacion') || '';
      const metodoPago = comp.getAttribute('MetodoPago') || '';
      const lugarExpedicion = comp.getAttribute('LugarExpedicion') || '';
      
      // Extraer datos del emisor
      const emisor = doc.getElementsByTagName('cfdi:Emisor')[0];
      const emisorRfc = emisor ? emisor.getAttribute('Rfc') || '' : '';
      const emisorNombre = emisor ? emisor.getAttribute('Nombre') || '' : '';
      const emisorRegimen = emisor ? emisor.getAttribute('RegimenFiscal') || '' : '';
      
      // Extraer datos del receptor
      const receptor = doc.getElementsByTagName('cfdi:Receptor')[0];
      const receptorRfc = receptor ? receptor.getAttribute('Rfc') || '' : '';
      const receptorNombre = receptor ? receptor.getAttribute('Nombre') || '' : '';
      const receptorDomicilio = receptor ? receptor.getAttribute('DomicilioFiscalReceptor') || '' : '';
      const receptorRegimen = receptor ? receptor.getAttribute('RegimenFiscalReceptor') || '' : '';
      const usoCFDI = receptor ? receptor.getAttribute('UsoCFDI') || '' : '';
      
      // Construir la cadena original
      let cadenaOriginal = [
        '||',
        version, '|',
        serie, '|',
        folio, '|',
        fecha, '|',
        formaPago, '|',
        subTotal, '|',
        moneda, '|',
        total, '|',
        tipoDeComprobante, '|',
        exportacion, '|',
        metodoPago, '|',
        lugarExpedicion, '|',
        emisorRfc, '|',
        emisorNombre, '|',
        emisorRegimen, '|',
        receptorRfc, '|',
        receptorNombre, '|',
        receptorDomicilio, '|',
        receptorRegimen, '|',
        usoCFDI, '|'
      ].join('');
      
      // Procesar conceptos
      const conceptos = doc.getElementsByTagName('cfdi:Concepto');
      for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        cadenaOriginal += [
          concepto.getAttribute('ClaveProdServ') || '', '|',
          concepto.getAttribute('Cantidad') || '', '|',
          concepto.getAttribute('ClaveUnidad') || '', '|',
          concepto.getAttribute('Unidad') || '', '|',
          concepto.getAttribute('Descripcion') || '', '|',
          concepto.getAttribute('ValorUnitario') || '', '|',
          concepto.getAttribute('Importe') || '', '|',
          concepto.getAttribute('ObjetoImp') || '', '|'
        ].join('');
        
        // Procesar impuestos de cada concepto
        const impuestos = concepto.getElementsByTagName('cfdi:Impuestos');
        if (impuestos.length > 0) {
          // Procesamiento de traslados
          const traslados = impuestos[0].getElementsByTagName('cfdi:Traslado');
          for (let j = 0; j < traslados.length; j++) {
            const traslado = traslados[j];
            cadenaOriginal += [
              traslado.getAttribute('Base') || '', '|',
              traslado.getAttribute('Impuesto') || '', '|',
              traslado.getAttribute('TipoFactor') || '', '|',
              traslado.getAttribute('TasaOCuota') || '', '|',
              traslado.getAttribute('Importe') || '', '|'
            ].join('');
          }
          
          // Procesamiento de retenciones
          const retenciones = impuestos[0].getElementsByTagName('cfdi:Retencion');
          for (let j = 0; j < retenciones.length; j++) {
            const retencion = retenciones[j];
            cadenaOriginal += [
              retencion.getAttribute('Base') || '', '|',
              retencion.getAttribute('Impuesto') || '', '|',
              retencion.getAttribute('TipoFactor') || '', '|',
              retencion.getAttribute('TasaOCuota') || '', '|',
              retencion.getAttribute('Importe') || '', '|'
            ].join('');
          }
        }
      }
      
      // Procesar impuestos globales
      const impuestosGlobales = doc.getElementsByTagName('cfdi:Impuestos');
      if (impuestosGlobales.length > 0 && impuestosGlobales[0].parentNode === comp) {
        cadenaOriginal += impuestosGlobales[0].getAttribute('TotalImpuestosTrasladados') || '', '|';
        
        // Procesamiento de traslados globales
        const traslados = impuestosGlobales[0].getElementsByTagName('cfdi:Traslado');
        for (let i = 0; i < traslados.length; i++) {
          const traslado = traslados[i];
          cadenaOriginal += [
            traslado.getAttribute('Base') || '', '|',
            traslado.getAttribute('Impuesto') || '', '|',
            traslado.getAttribute('TipoFactor') || '', '|',
            traslado.getAttribute('TasaOCuota') || '', '|',
            traslado.getAttribute('Importe') || '', '|'
          ].join('');
        }
        
        // Procesamiento de retenciones globales
        const retenciones = impuestosGlobales[0].getElementsByTagName('cfdi:Retencion');
        for (let i = 0; i < retenciones.length; i++) {
          const retencion = retenciones[i];
          cadenaOriginal += [
            retencion.getAttribute('Impuesto') || '', '|',
            retencion.getAttribute('Importe') || '', '|'
          ].join('');
        }
      }
      
      // Agregar finalizador
      cadenaOriginal += '||';
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempXmlPath);
      
      this.logger.debug('Cadena original generada:');
      this.logger.debug(cadenaOriginal);
      
      return cadenaOriginal;
    } catch (error) {
      this.logger.error(`Error generando cadena original: ${error.message}`);
      throw error;
    }
  } // AQUÍ FALTABA ESTA LLAVE DE CIERRE

  async getCertificateNumber(certPath: string): Promise<string> {
    try {
        const outputPath = path.join(process.cwd(), 'temp', `cert_${Date.now()}.txt`);
    // Usar la ruta absoluta de OpenSSL
    const command = `"${this.opensslPath}" x509 -inform DER -in "${certPath}" -serial -noout > "${outputPath}"`;
         
      
      await execAsync(command);

      // Leer resultado
      const serialInfo = await fs.promises.readFile(outputPath, 'utf8');
      
      // Limpiar archivo temporal
      fs.unlinkSync(outputPath);

      // Extraer número de serie (formato: serial=XXXXX)
      const serial = serialInfo.trim().replace('serial=', '');
      
      // Convertir de hexadecimal a decimal si es necesario
      const decimalSerial = BigInt(`0x${serial}`).toString();
      
      // Formatear a 20 dígitos
      return decimalSerial.padStart(20, '0');
    } catch (error) {
      this.logger.error(`Error obteniendo número de certificado: ${error.message}`);
      throw new Error(`Error obteniendo número de certificado: ${error.message}`);
    }
  }

  async getCertificateBase64(certPath: string): Promise<string> {
    try {
      // Leer certificado
      const certBuffer = await fs.promises.readFile(certPath);
      
      // Convertir a base64
      return certBuffer.toString('base64');
    } catch (error) {
      this.logger.error(`Error obteniendo certificado en base64: ${error.message}`);
      throw new Error(`Error obteniendo certificado en base64: ${error.message}`);
    }
  }

  async testSignature(cadenaOriginal: string, keyPath: string, password: string): Promise<boolean> {
    try {
      // Generar el sello
      const sello = await this.generateDigest(cadenaOriginal, keyPath, password);
      
      // Convertir el sello de base64 a binario
      const selloBuffer = Buffer.from(sello, 'base64');
      
      // Obtener el certificado y extraer la llave pública
      const certPath = path.join(process.cwd(), 'resources', 'certificates', 'CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer');
      const command = `openssl x509 -inform DER -in "${certPath}" -pubkey -noout > public_key.pem`;
      await execAsync(command);
      
      // Guardar la cadena original en un archivo para verificación
      await fs.promises.writeFile('cadena_test.txt', cadenaOriginal, 'utf8');
      
      // Guardar el sello en un archivo para verificación
      await fs.promises.writeFile('sello_test.sig', selloBuffer);
      
      // Verificar la firma
      const verifyCommand = `openssl dgst -sha256 -verify public_key.pem -signature sello_test.sig cadena_test.txt`;
      const { stdout } = await execAsync(verifyCommand);
      
      // Limpiar archivos temporales
      fs.unlinkSync('public_key.pem');
      fs.unlinkSync('cadena_test.txt');
      fs.unlinkSync('sello_test.sig');
      
      return stdout.includes('Verified OK');
    } catch (error) {
      this.logger.error(`Error en prueba de firma: ${error.message}`);
      return false;
    }
  }
}