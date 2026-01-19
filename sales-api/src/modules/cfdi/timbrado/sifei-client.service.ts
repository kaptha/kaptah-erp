import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as xml2js from 'xml2js';

export interface TimbradoResponse {
  success: boolean;
  cfdiTimbrado?: string;
  uuid?: string;
  fechaTimbrado?: string;
  noCertificadoSAT?: string;
  selloSAT?: string;
  error?: string;
  codigoError?: string;
  rawResponse?: any;
}

@Injectable()
export class SifeiClientService {
  private readonly logger = new Logger(SifeiClientService.name);
  private readonly soapUrl = process.env.SIFEI_SOAP_URL || 'https://devcfdi.sifei.com.mx:8443/SIFEI/SIFEI';
  private readonly usuario = process.env.SIFEI_USUARIO;
  private readonly password = process.env.SIFEI_PASSWORD;
  private readonly idEquipo = process.env.SIFEI_ID_EQUIPO;

  constructor() {
    this.logger.log('🔧 SifeiClientService inicializado');
    this.logger.log(`📍 SOAP URL: ${this.soapUrl}`);
    this.logger.log(`👤 Usuario configurado: ${this.usuario ? 'SÍ' : 'NO'}`);
    this.logger.log(`🔑 Password configurado: ${this.password ? 'SÍ' : 'NO'}`);
    this.logger.log(`🖥️  IdEquipo: ${this.idEquipo ? 'SÍ' : 'NO'}`);
    // ⭐ Desactivar verificación SSL globalmente para desarrollo
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  /**
   * Timbrar CFDI con SIFEI usando el método getCFDI
   */
  async timbrarCfdi(xmlSinTimbrar: string): Promise<TimbradoResponse> {
    this.logger.log('📤 Iniciando proceso de timbrado con SIFEI');
    this.logger.log(`📏 Tamaño del XML: ${xmlSinTimbrar.length} caracteres`);

    try {
      if (!this.usuario || !this.password) {
        this.logger.error('❌ Credenciales SIFEI no configuradas');
        return {
          success: false,
          error: 'Credenciales de SIFEI no configuradas',
          codigoError: 'CONFIG_ERROR'
        };
      }

      const soapEnvelope = this.buildSoapEnvelopeGetCFDI(xmlSinTimbrar);
      
      this.logger.log('📦 SOAP Envelope construido');
      this.logger.debug('📄 SOAP Envelope (preview):');
      this.logger.debug(soapEnvelope.substring(0, 800) + '...');

      this.logger.log(`🌐 Enviando solicitud a: ${this.soapUrl}`);
      
      // ⭐ Configuración sin httpsAgent
      const response = await axios.post(this.soapUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 30000,
        validateStatus: () => true
      });

      this.logger.log(`📥 Respuesta recibida - Status: ${response.status}`);
      this.logger.log(`📥 Content-Type: ${response.headers['content-type']}`);
      this.logger.debug('📄 Respuesta completa:');
      this.logger.debug(typeof response.data === 'string' ? response.data.substring(0, 1500) : JSON.stringify(response.data, null, 2));

      if (response.status !== 200) {
        this.logger.error(`❌ Error HTTP: ${response.status}`);
        return {
          success: false,
          error: `Error HTTP ${response.status}`,
          codigoError: `HTTP_${response.status}`,
          rawResponse: response.data
        };
      }

      const resultado = await this.parseSoapResponse(response.data);
      return resultado;

    } catch (error) {
      this.logger.error('❌ Error en timbrado');
      this.logger.error(`❌ Tipo: ${error.constructor.name}`);
      this.logger.error(`❌ Mensaje: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`❌ Status: ${error.response.status}`);
        this.logger.error(`❌ Data: ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        error: `Error: ${error.message}`,
        codigoError: error.code || 'ERROR',
        rawResponse: error.response?.data
      };
    }
  }

  /**
 * Construir SOAP Envelope para getCFDI
 */
private buildSoapEnvelopeGetCFDI(xmlSinTimbrar: string): string {
  const xmlBase64 = Buffer.from(xmlSinTimbrar, 'utf-8').toString('base64');

  // ⭐ Parámetros SIN namespace (solo el método con namespace)
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://MApeados/">
  <SOAP-ENV:Body>
    <ns1:getCFDI>
      <Usuario>${this.usuario}</Usuario>
      <Password>${this.password}</Password>
      <archivoXMLZip>${xmlBase64}</archivoXMLZip>
      <Serie></Serie>
      <IdEquipo>${this.idEquipo}</IdEquipo>
    </ns1:getCFDI>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  return soapEnvelope;
}

  /**
   * Parsear respuesta SOAP
   */
  private async parseSoapResponse(soapResponse: any): Promise<TimbradoResponse> {
    this.logger.log('🔍 Parseando respuesta SOAP...');

    try {
      let xmlString: string;

      if (typeof soapResponse === 'string') {
        xmlString = soapResponse;
      } else {
        xmlString = JSON.stringify(soapResponse);
      }

      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [xml2js.processors.stripPrefix]
      });

      const resultado = await parser.parseStringPromise(xmlString);

      this.logger.debug('📋 Estructura parseada:');
      this.logger.debug(JSON.stringify(resultado, null, 2));

      const body = resultado?.Envelope?.Body;
      
      if (!body) {
        return {
          success: false,
          error: 'Respuesta malformada',
          codigoError: 'MALFORMED',
          rawResponse: resultado
        };
      }

      // Verificar Fault
      const fault = body.Fault;
      if (fault) {
        this.logger.error('❌ SOAP Fault:');
        this.logger.error(JSON.stringify(fault, null, 2));
        
        return {
          success: false,
          error: fault.faultstring || 'Error SOAP',
          codigoError: fault.faultcode || 'SOAP_FAULT',
          rawResponse: fault
        };
      }

      // Buscar getCFDIResponse
      const getCFDIResponse = body.getCFDIResponse;

      if (!getCFDIResponse) {
        this.logger.error('❌ No se encontró getCFDIResponse');
        return {
          success: false,
          error: 'Sin respuesta getCFDI',
          codigoError: 'NO_RESPONSE',
          rawResponse: body
        };
      }

      this.logger.debug('📋 getCFDIResponse:');
      this.logger.debug(JSON.stringify(getCFDIResponse, null, 2));

      const returnData = getCFDIResponse.return;

      if (!returnData) {
        this.logger.error('❌ No se encontró return');
        return {
          success: false,
          error: 'Sin datos de retorno',
          codigoError: 'NO_RETURN',
          rawResponse: getCFDIResponse
        };
      }

      this.logger.debug('📋 Return data:');
      this.logger.debug(JSON.stringify(returnData, null, 2));

      // Verificar error
      if (returnData.error || returnData.estatusError) {
        const errorMsg = returnData.error || returnData.estatusError;
        this.logger.error(`❌ Error del PAC: ${errorMsg}`);
        
        return {
          success: false,
          error: errorMsg,
          codigoError: 'PAC_ERROR',
          rawResponse: returnData
        };
      }

      // Extraer CFDI
      let cfdiTimbrado = returnData.cfdi || returnData.xmlTimbrado;

      if (!cfdiTimbrado) {
        this.logger.error('❌ No se encontró CFDI timbrado');
        return {
          success: false,
          error: 'CFDI no presente',
          codigoError: 'NO_CFDI',
          rawResponse: returnData
        };
      }

      // Decodificar base64
      if (!cfdiTimbrado.includes('<?xml')) {
        this.logger.log('🔄 Decodificando CFDI de Base64...');
        cfdiTimbrado = Buffer.from(cfdiTimbrado, 'base64').toString('utf-8');
      }

      this.logger.log('✅ CFDI timbrado recibido');
      this.logger.log(`📏 Tamaño: ${cfdiTimbrado.length} caracteres`);

      const timbreData = await this.extractTimbreData(cfdiTimbrado);

      return {
        success: true,
        cfdiTimbrado: cfdiTimbrado,
        uuid: timbreData.uuid,
        fechaTimbrado: timbreData.fechaTimbrado,
        noCertificadoSAT: timbreData.noCertificadoSAT,
        selloSAT: timbreData.selloSAT,
        rawResponse: returnData
      };

    } catch (error) {
      this.logger.error('❌ Error parseando:', error);
      this.logger.error(error.stack);
      
      return {
        success: false,
        error: `Error parseando: ${error.message}`,
        codigoError: 'PARSE_ERROR',
        rawResponse: soapResponse
      };
    }
  }

  /**
   * Extraer datos del timbre
   */
  private async extractTimbreData(cfdiTimbrado: string): Promise<any> {
    this.logger.log('🔍 Extrayendo datos del timbre...');

    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const cfdiObj = await parser.parseStringPromise(cfdiTimbrado);

      const complemento = cfdiObj['cfdi:Comprobante']?.['cfdi:Complemento'];
      const timbre = complemento?.['tfd:TimbreFiscalDigital'];

      if (!timbre || !timbre.$) {
        this.logger.warn('⚠️ No se encontró TimbreFiscalDigital');
        return {};
      }

      const timbreData = {
        uuid: timbre.$.UUID,
        fechaTimbrado: timbre.$.FechaTimbrado,
        noCertificadoSAT: timbre.$.NoCertificadoSAT,
        selloSAT: timbre.$.SelloSAT
      };

      this.logger.log('✅ Datos del timbre extraídos:');
      this.logger.log(`   UUID: ${timbreData.uuid}`);
      this.logger.log(`   Fecha: ${timbreData.fechaTimbrado}`);

      return timbreData;

    } catch (error) {
      this.logger.error('❌ Error extrayendo timbre:', error);
      return {};
    }
  }
}