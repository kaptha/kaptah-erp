import { Injectable, Logger } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

@Injectable()
export class OriginalStringService {
  private readonly logger = new Logger(OriginalStringService.name);
  private readonly xsltPath: string;

  constructor() {
    this.xsltPath = path.join(process.cwd(), 'resources', 'xslt', 'cadenaoriginal_4_0.xslt');
  }

  /**
   * Genera la cadena original usando XSLT y el método oficial recomendado por el SAT
   * @param xmlContent Contenido XML del CFDI
   * @returns Cadena original
   */
  async generateOriginalString(xmlContent: string): Promise<string> {
    try {
      this.logger.debug('Iniciando generación de cadena original');
      
      // Primero asegurarse que el XML no tenga atributos Sello, Certificado y NoCertificado
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const comprobante = xmlDoc.documentElement;

      // Limpiar atributos que no deben estar en la cadena original
      if (comprobante.hasAttribute('Sello')) {
        comprobante.removeAttribute('Sello');
      }
      
      // Creamos archivos temporales para el procesamiento XSLT
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const tempXmlPath = path.join(tempDir, `cfdi_temp_${Date.now()}.xml`);
      const tempOutputPath = path.join(tempDir, `cadena_temp_${Date.now()}.txt`);
      
      // Guardamos el XML limpio en un archivo temporal
      fs.writeFileSync(tempXmlPath, xmlContent);
      
      this.logger.debug(`Archivos temporales guardados en: ${tempDir}`);
      this.logger.debug(`XML temporal: ${tempXmlPath}`);
      this.logger.debug(`Cadena temporal: ${tempOutputPath}`);
      
      // Utilizamos xsltproc para la transformación (más confiable que implementaciones JS)
      return new Promise<string>((resolve, reject) => {
        // Verificamos si xsltproc está disponible
        const xsltproc = spawn('xsltproc', [
          '--output', tempOutputPath,
          this.xsltPath,
          tempXmlPath
        ]);
        
        let errorOutput = '';
        
        xsltproc.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        xsltproc.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`Error en xsltproc: ${errorOutput}`);
            
            // Si xsltproc falla, intentamos con la transformación XSLT en JavaScript
            this.transformWithLibxslt(tempXmlPath, tempOutputPath)
              .then(result => {
                // NO limpiamos archivos temporales para análisis
                this.logger.warn('⚠️ Archivos temporales conservados para análisis');
                resolve(result);
              })
              .catch(err => {
                // NO limpiamos archivos temporales para análisis
                this.logger.warn('⚠️ Archivos temporales conservados para análisis');
                reject(err);
              });
          } else {
            // xsltproc exitoso, leemos el resultado
            try {
              const cadenaOriginal = fs.readFileSync(tempOutputPath, 'utf8');
              this.logger.debug('Cadena original generada exitosamente');
              
              // NO limpiamos archivos temporales para análisis
              this.logger.debug('✅ Archivos temporales conservados para análisis');
              
              resolve(cadenaOriginal.trim());
            } catch (readError) {
              // NO limpiamos archivos temporales para análisis
              this.logger.warn('⚠️ Archivos temporales conservados para análisis');
              reject(readError);
            }
          }
        });
      });
    } catch (error) {
      this.logger.error('Error generando cadena original:', error);
      throw error;
    }
  }
  
  /**
   * Método alternativo para transformar usando libxslt
   */
  private async transformWithLibxslt(xmlPath: string, outputPath: string): Promise<string> {
    try {
      // Utilizando la biblioteca libxslt de Node
      const libxslt = require('libxslt');
      const libxmljs = libxslt.libxmljs;
      
      // Leemos los archivos
      const xsltString = fs.readFileSync(this.xsltPath, 'utf8');
      const xmlString = fs.readFileSync(xmlPath, 'utf8');
      
      // Parseamos el XML y el XSLT
      const xsltDoc = libxmljs.parseXml(xsltString);
      const xmlDoc = libxmljs.parseXml(xmlString);
      
      // Creamos el procesador XSLT
      const xsltProcessor = libxslt.parse(xsltDoc);
      
      // Aplicamos la transformación
      const result = xsltProcessor.apply(xmlDoc);
      
      // Guardamos el resultado
      fs.writeFileSync(outputPath, result);
      
      return result.trim();
    } catch (error) {
      this.logger.error('Error en transformación libxslt:', error);
      
      // Último recurso: usar la implementación XPath (menos precisa)
      return this.fallbackXPathTransform(xmlPath);
    }
  }
  
  /**
   * Método de respaldo que usa XPath como último recurso
   */
  private async fallbackXPathTransform(xmlPath: string): Promise<string> {
    try {
      const xmlContent = fs.readFileSync(xmlPath, 'utf8');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Implementación basada en la estructura mínima requerida por el SAT
      // Nota: Esta es una implementación parcial y debería usarse solo como último recurso
      
      // Obtenemos los valores de los principales nodos y atributos
      const comprobante = xmlDoc.documentElement;
      const cadenaOriginal = '||' + [
        comprobante.getAttribute('Version'),
        comprobante.getAttribute('Serie') || '',
        comprobante.getAttribute('Folio') || '',
        comprobante.getAttribute('Fecha'),
        comprobante.getAttribute('FormaPago') || '',
        comprobante.getAttribute('NoCertificado') || '',
        comprobante.getAttribute('SubTotal'),
        comprobante.getAttribute('Moneda'),
        comprobante.getAttribute('TipoCambio') || '',
        comprobante.getAttribute('Total'),
        comprobante.getAttribute('TipoDeComprobante'),
        comprobante.getAttribute('Exportacion') || '',
        comprobante.getAttribute('MetodoPago') || '',
        comprobante.getAttribute('LugarExpedicion')
      ].join('|');
      
      // Esta es una implementación básica y debería completarse con todos los elementos
      // definidos en el XSLT oficial del SAT
      
      this.logger.warn('Usando método de respaldo XPath - cadena original puede ser incompleta');
      return cadenaOriginal + '||';
    } catch (error) {
      this.logger.error('Error en transformación XPath de respaldo:', error);
      throw new Error('No se pudo generar la cadena original con ningún método');
    }
  }
  
  /**
   * Limpia archivos temporales creados durante el proceso
   */
  private cleanupTempFiles(xmlPath: string, outputPath: string): void {
    try {
      if (fs.existsSync(xmlPath)) {
        fs.unlinkSync(xmlPath);
      }
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (error) {
      this.logger.warn('Error al limpiar archivos temporales:', error);
    }
  }
}