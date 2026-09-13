import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Variables de entorno del módulo (Railway → cfdi-receiver-api):
 *   CERT_VAULT_URL            p.ej. http://reliable-harmony.railway.internal:3004/api
 *   CERT_VAULT_SERVICE_TOKEN  mismo valor que VAULT_SERVICE_TOKEN en cert-vault
 *   SAT_DESCARGA_CRON_ENABLED 'true' para activar los crons (default false)
 *   SAT_DESCARGA_CUENTAS      opcional: lista de cuentaUid separadas por coma; si está, el cron
 *                             diario solo procesa esas cuentas (útil para piloto)
 */
@Injectable()
export class SatDescargaConfig {
  readonly certVaultUrl: string;
  readonly certVaultServiceToken: string;
  readonly cronEnabled: boolean;
  readonly cuentasPiloto: string[];

  constructor(config: ConfigService) {
    this.certVaultUrl = (config.get<string>('CERT_VAULT_URL') ?? '').replace(/\/+$/, '');
    this.certVaultServiceToken = config.get<string>('CERT_VAULT_SERVICE_TOKEN') ?? '';
    this.cronEnabled = config.get<string>('SAT_DESCARGA_CRON_ENABLED') === 'true';
    this.cuentasPiloto = (config.get<string>('SAT_DESCARGA_CUENTAS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
  }

  assertConfigured(): void {
    if (!this.certVaultUrl || !this.certVaultServiceToken) {
      throw new Error('sat-descarga: faltan CERT_VAULT_URL o CERT_VAULT_SERVICE_TOKEN');
    }
  }
}
