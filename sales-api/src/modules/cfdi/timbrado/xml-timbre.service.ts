import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';

export interface TimbreData {
  uuid: string;
  fechaTimbrado: string;
  noCertificadoSAT: string;
  selloSAT: string;
}

@Injectable()
export class XmlTimbreService {
  private readonly logger = new Logger(XmlTimbreService.name);

  /**
   * Insertar el complemento TimbreFiscalDigital al CFDI
   */
  async insertarComplementoTimbre(
    xmlSinTimbrar: string,
    timbreData: TimbreData
  ): Promise<string> {
    this.logger.log('📝 Insertando complemento TimbreFiscalDigital...');

    try {
      // Parsear el XML
      const parser = new xml2js.Parser({ explicitArray: false });
      const cfdiObj = await parser.parseStringPromise(xmlSinTimbrar);

      // Obtener el comprobante
      const comprobante = cfdiObj['cfdi:Comprobante'];

      if (!comprobante) {
        throw new Error('No se encontró el nodo Comprobante en el XML');
      }

      // Crear el complemento si no existe
      if (!comprobante['cfdi:Complemento']) {
        comprobante['cfdi:Complemento'] = {};
      }

      // Agregar el TimbreFiscalDigital
      comprobante['cfdi:Complemento']['tfd:TimbreFiscalDigital'] = {
        $: {
          'xmlns:tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital',
          'xsi:schemaLocation': 'http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd',
          'Version': '1.1',
          'UUID': timbreData.uuid,
          'FechaTimbrado': timbreData.fechaTimbrado,
          'RfcProvCertif': 'SAT970701NN3',
          'SelloCFD': comprobante.$.Sello, // Sello original del CFDI
          'NoCertificadoSAT': timbreData.noCertificadoSAT,
          'SelloSAT': timbreData.selloSAT
        }
      };

      this.logger.log('✅ Complemento TimbreFiscalDigital insertado');
      this.logger.log(`   UUID: ${timbreData.uuid}`);

      // Convertir de nuevo a XML
      const builder = new xml2js.Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: false }
      });

      const cfdiConTimbre = builder.buildObject(cfdiObj);

      this.logger.log('✅ XML con timbre generado correctamente');

      return cfdiConTimbre;

    } catch (error) {
      this.logger.error('❌ Error insertando complemento de timbre:', error);
      throw new Error(`Error insertando timbre: ${error.message}`);
    }
  }

  /**
   * Extraer datos del timbre de un CFDI ya timbrado
   */
  async extraerDatosTimbre(cfdiTimbrado: string): Promise<TimbreData | null> {
    this.logger.log('🔍 Extrayendo datos del timbre...');

    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const cfdiObj = await parser.parseStringPromise(cfdiTimbrado);

      const complemento = cfdiObj['cfdi:Comprobante']?.['cfdi:Complemento'];
      const timbre = complemento?.['tfd:TimbreFiscalDigital'];

      if (!timbre || !timbre.$) {
        this.logger.warn('⚠️ No se encontró TimbreFiscalDigital');
        return null;
      }

      const timbreData: TimbreData = {
        uuid: timbre.$.UUID,
        fechaTimbrado: timbre.$.FechaTimbrado,
        noCertificadoSAT: timbre.$.NoCertificadoSAT,
        selloSAT: timbre.$.SelloSAT
      };

      this.logger.log('✅ Datos del timbre extraídos correctamente');

      return timbreData;

    } catch (error) {
      this.logger.error('❌ Error extrayendo datos del timbre:', error);
      return null;
    }
  }

  /**
   * Validar que un CFDI tenga timbre válido
   */
  async validarTimbre(cfdiTimbrado: string): Promise<boolean> {
    const timbreData = await this.extraerDatosTimbre(cfdiTimbrado);

    if (!timbreData) {
      return false;
    }

    // Validar que tenga UUID
    if (!timbreData.uuid || timbreData.uuid.length !== 36) {
      this.logger.warn('⚠️ UUID inválido');
      return false;
    }

    // Validar que tenga fecha de timbrado
    if (!timbreData.fechaTimbrado) {
      this.logger.warn('⚠️ Fecha de timbrado faltante');
      return false;
    }

    // Validar que tenga sello SAT
    if (!timbreData.selloSAT) {
      this.logger.warn('⚠️ Sello SAT faltante');
      return false;
    }

    this.logger.log('✅ Timbre válido');
    return true;
  }

  /**
   * Generar cadena original del complemento de certificación
   */
  generarCadenaOriginalTimbre(timbreData: TimbreData, selloCFD: string): string {
    return `||1.1|${timbreData.uuid}|${timbreData.fechaTimbrado}|SAT970701NN3|${selloCFD}|${timbreData.noCertificadoSAT}||`;
  }
}