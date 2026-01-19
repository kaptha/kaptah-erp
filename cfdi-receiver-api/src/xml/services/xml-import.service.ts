import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XmlRecibido } from '../entities/xml-recibido.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface ImportResult {
  totalProcesados: number;
  exitosos: number;
  errores: number;
  detalleErrores: string[];
}

@Injectable()
export class XmlImportService {
  private readonly logger = new Logger(XmlImportService.name);

  constructor(
    @InjectRepository(XmlRecibido)
    private xmlRepository: Repository<XmlRecibido>,
  ) {}

  /**
   * Importa toda la estructura de carpetas de XMLs
   */
  async importarEstructuraCompleta(
    rutaBase: string,
    usuarioId: string,
  ): Promise<ImportResult> {
    this.logger.log(`Iniciando importación masiva desde: ${rutaBase}`);
    
    const resultado: ImportResult = {
      totalProcesados: 0,
      exitosos: 0,
      errores: 0,
      detalleErrores: [],
    };

    try {
      // Validar que existe la ruta base
      if (!fs.existsSync(rutaBase)) {
        throw new Error(`La ruta no existe: ${rutaBase}`);
      }

      // Obtener carpetas de años (2024, 2025, etc.)
      const carpetasAnios = this.obtenerCarpetas(rutaBase);
      
      for (const anio of carpetasAnios) {
        const rutaAnio = path.join(rutaBase, anio);
        this.logger.log(`Procesando año: ${anio}`);
        
        // Obtener carpetas de meses (01, 02, 03, etc.)
        const carpetasMeses = this.obtenerCarpetas(rutaAnio);
        
        for (const mes of carpetasMeses) {
          const rutaMes = path.join(rutaAnio, mes);
          this.logger.log(`Procesando mes: ${anio}/${mes}`);
          
          // Procesar carpetas Emitidos y Recibidos
          await this.procesarCarpetaTipo(rutaMes, 'Emitidos', anio, mes, usuarioId, resultado);
          await this.procesarCarpetaTipo(rutaMes, 'Recibidos', anio, mes, usuarioId, resultado);
        }
      }

      this.logger.log(`Importación completada. Exitosos: ${resultado.exitosos}, Errores: ${resultado.errores}`);
      return resultado;

    } catch (error) {
      this.logger.error(`Error en importación masiva: ${error.message}`);
      resultado.detalleErrores.push(`Error general: ${error.message}`);
      return resultado;
    }
  }

  /**
   * Procesa una carpeta de tipo (Emitidos/Recibidos)
   */
  private async procesarCarpetaTipo(
    rutaMes: string,
    tipo: 'Emitidos' | 'Recibidos',
    anio: string,
    mes: string,
    usuarioId: string,
    resultado: ImportResult,
  ): Promise<void> {
    const rutaTipo = path.join(rutaMes, tipo);
    
    if (!fs.existsSync(rutaTipo)) {
      this.logger.warn(`Carpeta no existe: ${rutaTipo}`);
      return;
    }

    // Obtener subcarpetas I (Ingreso) y N (Nómina)
    const tiposComprobante = this.obtenerCarpetas(rutaTipo);
    
    for (const tipoComprobante of tiposComprobante) {
      if (!['I', 'N'].includes(tipoComprobante)) {
        continue; // Solo procesar carpetas I y N
      }

      const rutaTipoComprobante = path.join(rutaTipo, tipoComprobante);
      this.logger.log(`Procesando: ${tipo}/${tipoComprobante} en ${anio}/${mes}`);
      
      // Obtener carpetas de RFCs
      const carpetasRfc = this.obtenerCarpetas(rutaTipoComprobante);
      
      for (const rfcCarpeta of carpetasRfc) {
        const rutaRfc = path.join(rutaTipoComprobante, rfcCarpeta);
        await this.procesarArchivosXml(
          rutaRfc,
          tipo,
          tipoComprobante,
          rfcCarpeta,
          anio,
          mes,
          usuarioId,
          resultado,
        );
      }
    }
  }

  /**
   * Procesa todos los archivos XML en una carpeta de RFC
   */
  private async procesarArchivosXml(
    rutaRfc: string,
    tipo: 'Emitidos' | 'Recibidos',
    tipoComprobante: string,
    rfcCarpeta: string,
    anio: string,
    mes: string,
    usuarioId: string,
    resultado: ImportResult,
  ): Promise<void> {
    try {
      const archivos = fs.readdirSync(rutaRfc);
      const archivosXml = archivos.filter(archivo => 
        archivo.toLowerCase().endsWith('.xml')
      );

      this.logger.log(`Encontrados ${archivosXml.length} archivos XML en ${rutaRfc}`);

      for (const archivoXml of archivosXml) {
        const rutaCompleta = path.join(rutaRfc, archivoXml);
        await this.procesarArchivoXml(
          rutaCompleta,
          tipo,
          tipoComprobante,
          rfcCarpeta,
          anio,
          mes,
          usuarioId,
          resultado,
        );
      }

    } catch (error) {
      this.logger.error(`Error procesando carpeta RFC ${rutaRfc}: ${error.message}`);
      resultado.detalleErrores.push(`Error en carpeta ${rutaRfc}: ${error.message}`);
    }
  }

  /**
   * Procesa un archivo XML individual
   */
  private async procesarArchivoXml(
  rutaArchivo: string,
  tipo: 'Emitidos' | 'Recibidos',
  tipoComprobante: string,
  rfcCarpeta: string,
  anio: string,
  mes: string,
  usuarioId: string,
  resultado: ImportResult,
): Promise<void> {
  resultado.totalProcesados++;

  try {
    const contenidoXml = fs.readFileSync(rutaArchivo, 'utf-8');
    
    if (!contenidoXml || contenidoXml.trim().length === 0) {
      throw new Error('Archivo XML vacío');
    }

    // ✅ Extraer AMBOS RFCs del XML
    const { rfcEmisor, rfcReceptor } = await this.extraerRfcsDelXml(contenidoXml);
    
    const xmlRecord = this.xmlRepository.create({
      rfc_emisor: rfcEmisor,      // ✅ Ahora sí se guarda
      rfc_receptor: rfcReceptor,
      fecha_recepcion: new Date(),
      xml_completo: contenidoXml,
      usuario_id: usuarioId,
      estado_procesamiento: 'IMPORTADO',
    });

    await this.xmlRepository.save(xmlRecord);
    resultado.exitosos++;

    this.logger.debug(`XML procesado: ${path.basename(rutaArchivo)}`);

  } catch (error) {
    resultado.errores++;
    const mensajeError = `Error en ${path.basename(rutaArchivo)}: ${error.message}`;
    resultado.detalleErrores.push(mensajeError);
    this.logger.error(mensajeError);
  }
}
// ✅ Nuevo método para extraer AMBOS RFCs
private async extraerRfcsDelXml(contenidoXml: string): Promise<{
  rfcEmisor: string;
  rfcReceptor: string;
}> {
  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(contenidoXml);
    
    const comprobante = result['cfdi:Comprobante'] || result.Comprobante;
    
    let rfcEmisor = null;
    let rfcReceptor = null;
    
    // Extraer RFC del Emisor
    if (comprobante?.['cfdi:Emisor']?.['$']?.Rfc) {
      rfcEmisor = comprobante['cfdi:Emisor']['$'].Rfc;
    } else if (comprobante?.Emisor?.['$']?.Rfc) {
      rfcEmisor = comprobante.Emisor['$'].Rfc;
    }
    
    // Extraer RFC del Receptor
    if (comprobante?.['cfdi:Receptor']?.['$']?.Rfc) {
      rfcReceptor = comprobante['cfdi:Receptor']['$'].Rfc;
    } else if (comprobante?.Receptor?.['$']?.Rfc) {
      rfcReceptor = comprobante.Receptor['$'].Rfc;
    }
    
    return { 
      rfcEmisor: rfcEmisor || 'RFC_NO_ENCONTRADO',
      rfcReceptor: rfcReceptor || 'RFC_NO_ENCONTRADO'
    };
    
  } catch (error) {
    throw new Error(`Error parseando XML: ${error.message}`);
  }
}
async reprocesarRfcsExistentes(): Promise<{ procesados: number; actualizados: number; errores: number }> {
  const resultado = { procesados: 0, actualizados: 0, errores: 0 };
  
  const xmlsSinRfc = await this.xmlRepository.find();
  
  this.logger.log(`Encontrados ${xmlsSinRfc.length} XMLs para reprocesar`);
  
  for (const xml of xmlsSinRfc) {
    resultado.procesados++;
    
    try {
      // ✅ Extraer TODOS los datos del XML
      const datosExtraidos = await this.extraerDatosCompletosDelXml(xml.xml_completo);
      
      await this.xmlRepository.update(xml.id, datosExtraidos);
      
      resultado.actualizados++;
      
      if (resultado.actualizados % 50 === 0) {
        this.logger.log(`Progreso: ${resultado.actualizados} XMLs actualizados`);
      }
      
    } catch (error) {
      resultado.errores++;
      this.logger.error(`Error reprocesando XML ${xml.id}: ${error.message}`);
    }
  }
  
  this.logger.log(`Reprocesamiento completado. Actualizados: ${resultado.actualizados}, Errores: ${resultado.errores}`);
  return resultado;
}

  /**
   * Extrae el RFC del receptor del contenido XML
   */
  private async extraerRfcReceptor(contenidoXml: string): Promise<string> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(contenidoXml);
      
      // Buscar el RFC del receptor en diferentes posibles ubicaciones
      const comprobante = result['cfdi:Comprobante'] || result.Comprobante;
      
      if (comprobante && comprobante['cfdi:Receptor']) {
        return comprobante['cfdi:Receptor']['$'].Rfc || comprobante['cfdi:Receptor']['$'].rfc;
      } else if (comprobante && comprobante.Receptor) {
        return comprobante.Receptor['$'].Rfc || comprobante.Receptor['$'].rfc;
      }
      
      // Si no se encuentra, usar un valor por defecto
      return 'RFC_NO_ENCONTRADO';
      
    } catch (error) {
      this.logger.warn(`Error extrayendo RFC del XML: ${error.message}`);
      return 'RFC_ERROR_EXTRACCION';
    }
  }
// ✅ NUEVO método para extraer TODOS los datos del CFDI
private async extraerDatosCompletosDelXml(contenidoXml: string): Promise<Partial<XmlRecibido>> {
  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(contenidoXml);
    
    const comprobante = result['cfdi:Comprobante'] || result.Comprobante;
    const attrs = comprobante?.['$'] || comprobante;
    
    // Extraer RFCs
    const rfcEmisor = comprobante?.['cfdi:Emisor']?.['$']?.Rfc || 
                      comprobante?.Emisor?.['$']?.Rfc || 
                      'RFC_NO_ENCONTRADO';
    
    const rfcReceptor = comprobante?.['cfdi:Receptor']?.['$']?.Rfc || 
                        comprobante?.Receptor?.['$']?.Rfc || 
                        'RFC_NO_ENCONTRADO';
    
    const nombreEmisor = comprobante?.['cfdi:Emisor']?.['$']?.Nombre || 
                         comprobante?.Emisor?.['$']?.Nombre || 
                         null;
    
    // ✅ Extraer datos financieros
    const total = attrs?.Total ? parseFloat(attrs.Total) : null;
    const subtotal = attrs?.SubTotal ? parseFloat(attrs.SubTotal) : null;
    const folio = attrs?.Folio || null;
    const serie = attrs?.Serie || null;
    const moneda = attrs?.Moneda || 'MXN';
    const tipoComprobante = attrs?.TipoDeComprobante || null;
    const metodoPago = attrs?.MetodoPago || null;
    const formaPago = attrs?.FormaPago || null;
    
    // Extraer IVA del complemento de impuestos
    let iva = null;
    const impuestos = comprobante?.['cfdi:Impuestos'] || comprobante?.Impuestos;
    if (impuestos) {
      const traslados = impuestos?.['cfdi:Traslados']?.['cfdi:Traslado'] || 
                       impuestos?.Traslados?.Traslado;
      
      if (Array.isArray(traslados)) {
        const ivaTraslado = traslados.find(t => t?.['$']?.Impuesto === '002' || t?.Impuesto === '002');
        iva = ivaTraslado?.['$']?.Importe ? parseFloat(ivaTraslado['$'].Importe) : 
              ivaTraslado?.Importe ? parseFloat(ivaTraslado.Importe) : null;
      } else if (traslados) {
        iva = traslados?.['$']?.Importe ? parseFloat(traslados['$'].Importe) : 
              traslados?.Importe ? parseFloat(traslados.Importe) : null;
      }
    }
    
    // Extraer uso de CFDI
    const usoCfdi = comprobante?.['cfdi:Receptor']?.['$']?.UsoCFDI || 
                    comprobante?.Receptor?.['$']?.UsoCFDI || 
                    null;
    
    return {
      rfc_emisor: rfcEmisor,
      rfc_receptor: rfcReceptor,
      nombre_emisor: nombreEmisor,
      total,
      subtotal,
      iva,
      folio,
      serie,
      moneda,
      tipo_comprobante: tipoComprobante,
      metodo_pago: metodoPago,
      forma_pago: formaPago,
      uso_cfdi: usoCfdi
    };
    
  } catch (error) {
    throw new Error(`Error parseando XML: ${error.message}`);
  }
}
  /**
   * Obtiene las carpetas de un directorio
   */
  private obtenerCarpetas(ruta: string): string[] {
    try {
      return fs.readdirSync(ruta, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();
    } catch (error) {
      this.logger.warn(`Error leyendo carpetas de ${ruta}: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de XMLs importados
   */
  async obtenerEstadisticasImportacion(usuarioId: string) {
    const total = await this.xmlRepository.count({ where: { usuario_id: usuarioId } });
    const porEstado = await this.xmlRepository
      .createQueryBuilder('xml')
      .select('xml.estado_procesamiento', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .where('xml.usuario_id = :usuarioId', { usuarioId })
      .groupBy('xml.estado_procesamiento')
      .getRawMany();

    return {
      total,
      porEstado,
    };
  }
}