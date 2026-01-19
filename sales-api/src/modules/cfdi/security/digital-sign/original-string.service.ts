import { Injectable, Logger } from '@nestjs/common';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

// Definir tipos compatibles con @xmldom/xmldom
type XmlDocument = ReturnType<DOMParser['parseFromString']>;
type XmlElement = ReturnType<XmlDocument['createElement']>;
type XmlNodeList = ReturnType<XmlDocument['getElementsByTagName']>;

@Injectable()
export class OriginalStringService {
  private readonly logger = new Logger(OriginalStringService.name);
  private readonly xsltPath: string;

  constructor() {
    this.xsltPath = path.join(process.cwd(), 'resources', 'xslt', 'cadenaoriginal_4_0.xslt');
    
    // Verificar que el archivo XSLT existe
    if (!fs.existsSync(this.xsltPath)) {
      this.logger.warn(`¡ADVERTENCIA! No se encontró el archivo XSLT: ${this.xsltPath}`);
      this.logger.warn('La cadena original NO se generará correctamente sin el XSLT oficial del SAT');
    }
  }

  /**
   * Genera la cadena original siguiendo las especificaciones del SAT para CFDI 4.0
   * @param xmlContent Contenido XML del CFDI
   * @returns Cadena original
   */
  async generateOriginalString(xmlContent: string): Promise<string> {
    try {
      this.logger.debug('Iniciando generación de cadena original');
      
      // Paso 1: Asegurarse de que el XML tiene el formato correcto
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const comprobante = xmlDoc.documentElement;
      
      // Paso 2: Eliminar el sello si existe (no debe estar en la cadena original)
      if (comprobante.hasAttribute('Sello')) {
        comprobante.removeAttribute('Sello');
      }
      
      // Paso 3: Asegurarse de que las Retenciones están antes que los Traslados
      this.reorderRetencionesTrasladados(xmlDoc);
      
      // Paso 4: Serializar el XML corregido
      const serializer = new XMLSerializer();
      const correctedXml = serializer.serializeToString(xmlDoc);
      
      // Paso 5: Aplicar transformación XSLT
      // Intentar múltiples métodos para asegurar que la cadena original se genere correctamente
      
      // Opción 1: Usar xsltproc (si está disponible en el sistema)
      try {
        const result = await this.transformWithXsltproc(correctedXml);
        if (result && result.trim().startsWith('||')) {
          this.logger.debug('Cadena original generada exitosamente con xsltproc');
          return result.trim();
        }
      } catch (xsltprocError) {
        this.logger.debug('Error usando xsltproc, intentando otro método:', xsltprocError.message);
      }
      
      // Opción 2: Usar el método de transformación manual
      try {
        const result = await this.manualTransformation(correctedXml);
        if (result && result.trim().startsWith('||')) {
          this.logger.debug('Cadena original generada exitosamente con método manual');
          return result.trim();
        }
      } catch (manualError) {
        this.logger.debug('Error usando transformación manual:', manualError.message);
      }
      
      // Si llegamos aquí, todas las opciones fallaron
      throw new Error('No se pudo generar la cadena original. Verifique que el archivo XSLT es correcto.');
      
    } catch (error) {
      this.logger.error('Error generando cadena original:', error);
      throw error;
    }
  }
  
  /**
   * Reordena las secciones de Retenciones y Traslados para asegurar el orden correcto
   * @param xmlDoc Documento XML
   */
  private reorderRetencionesTrasladados(xmlDoc: XmlDocument): void {
    try {
      // Encontrar todos los nodos de Impuestos (tanto a nivel comprobante como en conceptos)
      const impuestosList = xmlDoc.getElementsByTagName('cfdi:Impuestos');
      
      for (let i = 0; i < impuestosList.length; i++) {
        const impuestos = impuestosList[i];
        
        // Buscar las secciones de Retenciones y Traslados
        let retenciones = null;
        let traslados = null;
        
        for (let j = 0; j < impuestos.childNodes.length; j++) {
          const node = impuestos.childNodes[j];
          if (node.nodeName === 'cfdi:Retenciones') {
            retenciones = node;
          } else if (node.nodeName === 'cfdi:Traslados') {
            traslados = node;
          }
        }
        
        // Si ambos existen y Traslados está antes que Retenciones, reordenar
        if (retenciones && traslados) {
          // Determinar el orden actual
          let retencionesFirst = false;
          for (let j = 0; j < impuestos.childNodes.length; j++) {
            if (impuestos.childNodes[j] === retenciones) {
              retencionesFirst = true;
              break;
            }
            if (impuestos.childNodes[j] === traslados) {
              break;
            }
          }
          
          // Reordenar si es necesario
          if (!retencionesFirst) {
            this.logger.debug('Reordenando secciones: Retenciones debe ir antes que Traslados');
            
            // Clonar los nodos (para preservar cualquier nodo hijo)
            const retencionesClone = retenciones.cloneNode(true);
            const trasladosClone = traslados.cloneNode(true);
            
            // Eliminar los nodos originales
            impuestos.removeChild(retenciones);
            impuestos.removeChild(traslados);
            
            // Agregar en el orden correcto: primero Retenciones, luego Traslados
            impuestos.appendChild(retencionesClone);
            impuestos.appendChild(trasladosClone);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error reordenando Retenciones y Traslados:', error);
      // No lanzar error para permitir continuar el proceso
    }
  }
  
  /**
   * Transforma el XML usando xsltproc (utilidad externa)
   * @param xmlContent Contenido XML
   * @returns Cadena original
   */
  private async transformWithXsltproc(xmlContent: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Crear archivos temporales para el proceso
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }
        
        const tempXmlPath = path.join(tempDir, `cfdi_temp_${Date.now()}.xml`);
        const tempOutputPath = path.join(tempDir, `cadena_temp_${Date.now()}.txt`);
        
        // Guardar el XML en un archivo temporal
        fs.writeFileSync(tempXmlPath, xmlContent, 'utf8');
        
        // Ejecutar xsltproc
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
          try {
            // Limpiar archivos temporales al finalizar
            const cleanup = () => {
              try {
                if (fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
              } catch (cleanupError) {
                this.logger.warn('Error limpiando archivos temporales:', cleanupError);
              }
            };
            
            if (code !== 0) {
              cleanup();
              reject(new Error(`xsltproc falló con código ${code}: ${errorOutput}`));
              return;
            }
            
            // Leer el resultado
            if (fs.existsSync(tempOutputPath)) {
              const result = fs.readFileSync(tempOutputPath, 'utf8');
              cleanup();
              resolve(result);
            } else {
              cleanup();
              reject(new Error('No se generó el archivo de salida'));
            }
          } catch (cleanupError) {
            reject(cleanupError);
          }
        });
        
        xsltproc.on('error', (error) => {
          // Probablemente xsltproc no está instalado
          reject(new Error(`Error ejecutando xsltproc: ${error.message}`));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * =========================================================================
   * TRANSFORMACIÓN MANUAL CORREGIDA
   * =========================================================================
   * Cambios realizados:
   * 1. Obtiene correctamente el nodo de Impuestos a nivel Comprobante
   * 2. Procesa solo los hijos directos (no todos los descendientes)
   * 3. Agregado SubTotal del comprobante después de TotalImpuestosRetenidos
   * 4. Eliminado atributo Base de los Traslados a nivel comprobante
   * =========================================================================
   */
  private async manualTransformation(xmlContent: string): Promise<string> {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Función auxiliar para obtener el valor de un atributo
      const getAttr = (node: any, attr: string) => {
        if (node && typeof node.getAttribute === 'function') {
          return node.getAttribute(attr) || '';
        }
        return '';
      };
      
      // Inicio de la cadena
      let cadena = '||';
      
      // Datos del comprobante
      const comprobante = xmlDoc.documentElement;
      cadena += [
        getAttr(comprobante, 'Version'),
        getAttr(comprobante, 'Serie'),
        getAttr(comprobante, 'Folio'),
        getAttr(comprobante, 'Fecha'),
        getAttr(comprobante, 'FormaPago'),
        getAttr(comprobante, 'NoCertificado'),
        getAttr(comprobante, 'SubTotal'),
        getAttr(comprobante, 'Moneda'),
        getAttr(comprobante, 'Total'),
        getAttr(comprobante, 'TipoDeComprobante'),
        getAttr(comprobante, 'Exportacion'),
        getAttr(comprobante, 'MetodoPago'),
        getAttr(comprobante, 'LugarExpedicion')
      ].join('|');
      
      // Datos del emisor
      const emisor = xmlDoc.getElementsByTagName('cfdi:Emisor')[0];
      if (emisor) {
        cadena += '|' + [
          getAttr(emisor, 'Rfc'),
          getAttr(emisor, 'Nombre'),
          getAttr(emisor, 'RegimenFiscal')
        ].join('|');
      }
      
      // Datos del receptor
      const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0];
      if (receptor) {
        cadena += '|' + [
          getAttr(receptor, 'Rfc'),
          getAttr(receptor, 'Nombre'),
          getAttr(receptor, 'DomicilioFiscalReceptor'),
          getAttr(receptor, 'RegimenFiscalReceptor'),
          getAttr(receptor, 'UsoCFDI')
        ].join('|');
      }
      
      // Conceptos
      const conceptos = xmlDoc.getElementsByTagName('cfdi:Concepto');
      for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        
        cadena += '|' + [
          getAttr(concepto, 'ClaveProdServ'),
          getAttr(concepto, 'Cantidad'),
          getAttr(concepto, 'ClaveUnidad'),
          getAttr(concepto, 'Unidad'),
          getAttr(concepto, 'Descripcion'),
          getAttr(concepto, 'ValorUnitario'),
          getAttr(concepto, 'Importe'),
          getAttr(concepto, 'ObjetoImp')
        ].join('|');
        
        // Impuestos del concepto (estos SÍ incluyen Base en traslados y retenciones)
        const impuestosConcepto = concepto.getElementsByTagName('cfdi:Impuestos')[0];
        if (impuestosConcepto) {
          // Traslados del concepto
          const trasladosConcepto = impuestosConcepto.getElementsByTagName('cfdi:Traslado');
          for (let j = 0; j < trasladosConcepto.length; j++) {
            const traslado = trasladosConcepto[j];
            cadena += '|' + [
              getAttr(traslado, 'Base'),
              getAttr(traslado, 'Impuesto'),
              getAttr(traslado, 'TipoFactor'),
              getAttr(traslado, 'TasaOCuota'),
              getAttr(traslado, 'Importe')
            ].join('|');
          }
          
          // Retenciones del concepto
          const retencionesConcepto = impuestosConcepto.getElementsByTagName('cfdi:Retencion');
          for (let j = 0; j < retencionesConcepto.length; j++) {
            const retencion = retencionesConcepto[j];
            cadena += '|' + [
              getAttr(retencion, 'Base'),
              getAttr(retencion, 'Impuesto'),
              getAttr(retencion, 'TipoFactor'),
              getAttr(retencion, 'TasaOCuota'),
              getAttr(retencion, 'Importe')
            ].join('|');
          }
        }
      }
      
      // =========================================================================
      // SECCIÓN CRÍTICA CORREGIDA: Impuestos a nivel comprobante
      // =========================================================================
      
      // CORRECCIÓN 1: Obtener el nodo de Impuestos que es hijo directo del Comprobante
      let impuestosComprobante = null;
      for (let i = 0; i < comprobante.childNodes.length; i++) {
        const node = comprobante.childNodes[i];
        if (node.nodeName === 'cfdi:Impuestos') {
          impuestosComprobante = node;
          break;
        }
      }
      
      if (impuestosComprobante) {
        // CORRECCIÓN 2: Obtener solo los nodos hijos directos de Retenciones y Traslados
        let retencionesNode = null;
        let trasladosNode = null;
        
        for (let i = 0; i < impuestosComprobante.childNodes.length; i++) {
          const node = impuestosComprobante.childNodes[i];
          if (node.nodeName === 'cfdi:Retenciones') {
            retencionesNode = node;
          } else if (node.nodeName === 'cfdi:Traslados') {
            trasladosNode = node;
          }
        }
        
        // PASO 1: Procesar Retenciones a nivel comprobante
        if (retencionesNode) {
          const retencionesComprobante = retencionesNode.getElementsByTagName('cfdi:Retencion');
          for (let i = 0; i < retencionesComprobante.length; i++) {
            const retencion = retencionesComprobante[i];
            cadena += '|' + [
              getAttr(retencion, 'Impuesto'),
              getAttr(retencion, 'Importe')
            ].join('|');
          }
        }
        
        // PASO 2: Agregar TotalImpuestosRetenidos si existe
        if (impuestosComprobante.hasAttribute('TotalImpuestosRetenidos')) {
          cadena += '|' + getAttr(impuestosComprobante, 'TotalImpuestosRetenidos');
        }
        
        // *** CORRECCIÓN 3: AGREGAR SubTotal del Comprobante ***
        // Este es el valor que faltaba en la cadena original
        cadena += '|' + getAttr(comprobante, 'SubTotal');
        
        // PASO 3: Procesar Traslados a nivel comprobante
        // *** CORRECCIÓN 4: SIN incluir el atributo Base ***
        if (trasladosNode) {
          const trasladosComprobante = trasladosNode.getElementsByTagName('cfdi:Traslado');
          for (let i = 0; i < trasladosComprobante.length; i++) {
            const traslado = trasladosComprobante[i];
            // IMPORTANTE: Los traslados a nivel comprobante NO incluyen Base
            cadena += '|' + [
              getAttr(traslado, 'Impuesto'),
              getAttr(traslado, 'TipoFactor'),
              getAttr(traslado, 'TasaOCuota'),
              getAttr(traslado, 'Importe')
            ].join('|');
          }
        }
        
        // PASO 4: Agregar TotalImpuestosTrasladados si existe
        if (impuestosComprobante.hasAttribute('TotalImpuestosTrasladados')) {
          cadena += '|' + getAttr(impuestosComprobante, 'TotalImpuestosTrasladados');
        }
      }
      
      // Finalizar la cadena
      cadena += '||';
      
      this.logger.debug('Cadena original generada manualmente (corregida)');
      
      return cadena;
    } catch (error) {
      this.logger.error('Error en transformación manual:', error);
      throw error;
    }
  }
}