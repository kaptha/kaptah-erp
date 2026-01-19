import { Injectable, Logger } from '@nestjs/common';
import { SifeiClientService } from './sifei-client.service';
import { XmlTimbreService } from './xml-timbre.service';

@Injectable()
export class TimbradoService {
  private readonly logger = new Logger(TimbradoService.name);

  constructor(
    private readonly sifeiClient: SifeiClientService,
    private readonly xmlTimbreService: XmlTimbreService,
  ) {}

  /**
   * Orquestar el proceso de timbrado completo
   */
  async timbrarCfdi(xmlSinTimbrar: string): Promise<any> {
    this.logger.log('🎯 Iniciando orquestación de timbrado');

    try {
      // 1. Timbrar con SIFEI (PAC)
      this.logger.log('📤 Paso 1: Enviando a timbrar con PAC SIFEI...');
      const resultadoTimbrado = await this.sifeiClient.timbrarCfdi(xmlSinTimbrar);

      // ⭐ LOG: Mostrar resultado completo
      this.logger.log('📋 Resultado del timbrado:');
      this.logger.log(JSON.stringify(resultadoTimbrado, null, 2));

      if (!resultadoTimbrado.success) {
        this.logger.error('❌ Timbrado fallido');
        this.logger.error(`   Error: ${resultadoTimbrado.error}`);
        this.logger.error(`   Código: ${resultadoTimbrado.codigoError}`);
        
        if (resultadoTimbrado.rawResponse) {
          this.logger.error('   Raw Response:');
          this.logger.error(JSON.stringify(resultadoTimbrado.rawResponse, null, 2));
        }

        throw new Error(`Error de timbrado: ${resultadoTimbrado.error}`);
      }

      this.logger.log('✅ Timbrado exitoso');
      this.logger.log(`   UUID: ${resultadoTimbrado.uuid}`);
      this.logger.log(`   Fecha: ${resultadoTimbrado.fechaTimbrado}`);

      // 2. Insertar complemento TimbreFiscalDigital
      this.logger.log('📝 Paso 2: Insertando complemento de timbre...');
      const cfdiConTimbre = await this.xmlTimbreService.insertarComplementoTimbre(
        xmlSinTimbrar,
        {
          uuid: resultadoTimbrado.uuid,
          fechaTimbrado: resultadoTimbrado.fechaTimbrado,
          noCertificadoSAT: resultadoTimbrado.noCertificadoSAT,
          selloSAT: resultadoTimbrado.selloSAT,
        }
      );

      this.logger.log('✅ Complemento de timbre insertado correctamente');

      return {
        success: true,
        cfdiTimbrado: cfdiConTimbre,
        uuid: resultadoTimbrado.uuid,
        fechaTimbrado: resultadoTimbrado.fechaTimbrado,
        noCertificadoSAT: resultadoTimbrado.noCertificadoSAT,
        selloSAT: resultadoTimbrado.selloSAT,
      };

    } catch (error) {
      this.logger.error('❌ Error en el proceso de timbrado:', error);
      this.logger.error(error.stack);
      throw error;
    }
  }
}