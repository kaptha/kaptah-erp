import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QueueName } from '../config/queue.config';

interface CancelacionJob {
  cfdiId: string;
  motivo: string;
  uuidSustitucion?: string;
  userId: string;
  empresaId: string;
  certificadoId: string;
  firebaseToken?: string;
}

@Processor(QueueName.CFDI_TIMBRADO)
export class CfdiCancelacionProcessor {
  private readonly logger = new Logger(CfdiCancelacionProcessor.name);

  private readonly salesApiUrl = process.env.SALES_API_URL || 'http://localhost:3001';
  private readonly certVaultUrl = process.env.CERT_VAULT_URL || 'http://localhost:3004';
  private readonly sifeiCancelUrl = process.env.SIFEI_CANCEL_URL || 'http://devcfdi.sifei.com.mx:8080/CancelacionSIFEI/Cancelacion';
  private readonly sifeiUsuario = process.env.SIFEI_USUARIO;
  private readonly sifeiPassword = process.env.SIFEI_PASSWORD;
  private readonly serviceToken = process.env.SERVICE_TOKEN;
  private readonly internalApiKey = process.env.INTERNAL_API_KEY;

  constructor(private readonly httpService: HttpService) {
    this.logger.log('CfdiCancelacionProcessor inicializado');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  @Process('cancelar-cfdi')
  async cancelarCFDI(job: Job<CancelacionJob>): Promise<any> {
    const { cfdiId, motivo, uuidSustitucion, userId, firebaseToken } = job.data;
    this.logger.log(`🚫 Procesando cancelacion CFDI: ${cfdiId} motivo: ${motivo}`);

    try {
      await job.progress(10);

      // 1. Obtener datos del CFDI desde sales-api (uuid y rfcEmisor)
      this.logger.log('📋 Obteniendo datos del CFDI...');
      const cfdiData = await this.getCfdiData(cfdiId, userId);
      if (!cfdiData) {
        throw new Error(`CFDI ${cfdiId} no encontrado`);
      }
      const { uuid, rfcEmisor } = cfdiData;
      this.logger.log(`✅ UUID: ${uuid} RFC: ${rfcEmisor}`);

      await job.progress(25);

      // 2. Obtener CSD desde cert-vault-service usando userId como firebaseUid
      this.logger.log('🔐 Obteniendo CSD del cert-vault-service...');
      const csd = await this.getCsd(firebaseToken || userId);
      await job.progress(40);

      // 3. Generar PFX en memoria
      this.logger.log('🔑 Generando PFX en memoria...');
      const { pfxBase64, pfxPassword } = await this.generarPfx(
        csd.cerPem,
        csd.keyPem,
        csd.passwordKeyfile || csd.password || ''
      );
      await job.progress(55);

      // 4. Llamar al WS SOAP de cancelación de SIFEI
      this.logger.log('🌐 Llamando WS cancelacion SIFEI...');
      const resultado = await this.llamarWsCancelacion(
        uuid,
        motivo,
        uuidSustitucion,
        rfcEmisor,
        pfxBase64,
        pfxPassword
      );
      await job.progress(80);

      this.logger.log(`📥 Resultado SIFEI: ${JSON.stringify(resultado)}`);

      // 5. Actualizar estado en sales-api
      if (resultado.success) {
        await this.actualizarCfdi(cfdiId, {
          status: 'cancelado',
          error_message: null
        });
        this.logger.log(`✅ CFDI ${cfdiId} cancelado exitosamente - codigo SAT: ${resultado.codigoSAT}`);
      } else {
        // Codigo 202 = ya estaba cancelado, igual lo marcamos
        if (resultado.codigoSAT === '202') {
          await this.actualizarCfdi(cfdiId, { status: 'cancelado', error_message: null });
        } else {
          await this.actualizarCfdi(cfdiId, {
            status: 'timbrado',
            error_message: `Error cancelacion: ${resultado.error || resultado.codigoSAT}`
          });
          throw new Error(`Cancelacion rechazada por SAT: ${resultado.error || resultado.codigoSAT}`);
        }
      }

      await job.progress(100);
      return { success: true, codigoSAT: resultado.codigoSAT };

    } catch (error) {
      this.logger.error(`❌ Error cancelando CFDI ${cfdiId}: ${error.message}`);
      // Revertir estado a timbrado si hay error inesperado
      try {
        await this.actualizarCfdi(cfdiId, {
          status: 'timbrado',
          error_message: `Error cancelacion: ${error.message}`
        });
      } catch {}
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`❌ Job ${job.id} fallido: ${error.message}`);
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  private async getCfdiData(cfdiId: string, userId: string): Promise<{ uuid: string; rfcEmisor: string } | null> {
    try {
      const url = `${this.salesApiUrl}/api/cfdi/${cfdiId}?cuentaUid=${userId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.serviceToken}`,
            'x-internal-api-key': this.internalApiKey,
          }
        })
      );
      const cfdi = response.data;
      // Extraer RFC emisor del XML
      const rfcMatch = cfdi.xml?.match(/Emisor[^>]+Rfc="([^"]+)"/);
      const rfcEmisor = rfcMatch ? rfcMatch[1] : null;
      if (!cfdi.uuid || !rfcEmisor) {
        throw new Error('UUID o RFC emisor no encontrado en el CFDI');
      }
      return { uuid: cfdi.uuid, rfcEmisor };
    } catch (error) {
      this.logger.error(`Error obteniendo CFDI: ${error.message}`);
      return null;
    }
  }

  private async getCsd(userId: string): Promise<any> {
    const url = `${this.certVaultUrl}/api/certificates/csd/active`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'x-internal-api-key': this.internalApiKey,
        }
      })
    );
    if (!response.data) {
      throw new Error('No se encontro CSD activo');
    }
    return response.data;
  }

  private async generarPfx(
    cerPem: string,
    keyPem: string,
    csdPassword: string
  ): Promise<{ pfxBase64: string; pfxPassword: string }> {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const tmpDir = os.tmpdir();
    const ts = Date.now();
    const tmpCer = path.join(tmpDir, `cer_${ts}.pem`);
    const tmpKey = path.join(tmpDir, `key_${ts}.pem`);
    const tmpPfx = path.join(tmpDir, `pfx_${ts}.pfx`);
    const pfxPassword = 'kaptah_pfx_tmp';

    fs.writeFileSync(tmpCer, cerPem, 'utf8');
    fs.writeFileSync(tmpKey, keyPem, 'utf8');

    try {
      try {
        execSync(
          `openssl pkcs12 -export -in "${tmpCer}" -inkey "${tmpKey}" -out "${tmpPfx}" -passout pass:${pfxPassword} -passin pass:${csdPassword}`,
          { stdio: 'pipe' }
        );
      } catch {
        // Key sin cifrado
        execSync(
          `openssl pkcs12 -export -in "${tmpCer}" -inkey "${tmpKey}" -out "${tmpPfx}" -passout pass:${pfxPassword}`,
          { stdio: 'pipe' }
        );
      }
      const pfxBase64 = fs.readFileSync(tmpPfx).toString('base64');
      return { pfxBase64, pfxPassword };
    } finally {
      try { fs.unlinkSync(tmpCer); } catch {}
      try { fs.unlinkSync(tmpKey); } catch {}
      try { fs.unlinkSync(tmpPfx); } catch {}
    }
  }

  private async llamarWsCancelacion(
    uuid: string,
    motivo: string,
    uuidSustitucion: string | undefined,
    rfcEmisor: string,
    pfxBase64: string,
    pfxPassword: string
  ): Promise<{ success: boolean; codigoSAT?: string; error?: string }> {
    const axios = require('axios');
    const xml2js = require('xml2js');

    const uuidString = motivo === '01' && uuidSustitucion
      ? `|${uuid}|${motivo}|${uuidSustitucion}|`
      : `|${uuid}|${motivo}||`;

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:map="http://service.sifei.cancelacion/">
  <soapenv:Header/>
  <soapenv:Body>
    <map:cancelaCFDI>
      <usuarioSIFEI>${this.sifeiUsuario}</usuarioSIFEI>
      <passwordSifei>${this.sifeiPassword}</passwordSifei>
      <rfcEmisor>${rfcEmisor}</rfcEmisor>
      <pfx>${pfxBase64}</pfx>
      <passwordPfx>${pfxPassword}</passwordPfx>
      <uuids>${uuidString}</uuids>
    </map:cancelaCFDI>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await axios.post(this.sifeiCancelUrl, soapEnvelope, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Parsear respuesta
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });
    const resultado = await parser.parseStringPromise(response.data);
    const body = resultado?.Envelope?.Body;

    if (body?.Fault) {
      return { success: false, error: body.Fault.faultstring || 'SOAP Fault' };
    }

    const returnData = body?.cancelaCFDIResponse?.return;
    if (!returnData) {
      return { success: false, error: 'Sin respuesta del WS' };
    }

    const acuse = typeof returnData === 'string' ? returnData : returnData._ || '';
    const estatusMatch = acuse.match(/EstatusUUID="(\d+)"/);
    const codigoSAT = estatusMatch ? estatusMatch[1] : '201';
    const success = ['201', '202'].includes(codigoSAT);

    return { success, codigoSAT };
  }

  private async actualizarCfdi(cfdiId: string, data: { status: string; error_message?: string }): Promise<void> {
    try {
      const url = `${this.salesApiUrl}/api/cfdi/${cfdiId}/internal-update`;
      await firstValueFrom(
        this.httpService.patch(url, data, {
          headers: {
            'Authorization': `Bearer ${this.serviceToken}`,
          }
        })
      );
      this.logger.log(`✅ CFDI ${cfdiId} actualizado a status: ${data.status}`);
    } catch (error) {
      this.logger.error(`Error actualizando CFDI: ${error.message}`);
    }
  }
}

