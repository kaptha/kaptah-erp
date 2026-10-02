import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Interface para la respuesta del CSD desde cert-vault-service
 */
export interface CsdCertificate {
  id: string;
  userId: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  issuerName: string;
  issuerSerial: string;
  cerPem: string;      // Certificado en formato PEM
  keyPem: string;      // Llave privada en formato PEM (encriptada)
  cerBase64: string;   // Certificado en Base64
  keyBase64: string;   // Llave en Base64
  passwordKeyfile?: string;    // Contraseña de la llave privada (nombre del campo en BD)
  password?: string;           // Alias para compatibilidad
}

/**
 * Interface para la respuesta de FIEL desde cert-vault-service
 */
export interface FielCertificate {
  id: string;
  userId: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  issuerName: string;
  issuerSerial: string;
  cerPem: string;
  keyPem: string;
  cerBase64: string;
  keyBase64: string;
  passwordKeyfile?: string;    // Contraseña de la llave privada (nombre del campo en BD)
  password?: string;           // Alias para compatibilidad
}

@Injectable()
export class CertVaultClientService {
  private readonly logger = new Logger(CertVaultClientService.name);
  private readonly certVaultUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // URL del cert-vault-service desde variables de entorno
    this.certVaultUrl = this.configService.get<string>('CERT_VAULT_URL', 'http://localhost:3004');
    this.logger.log(`CertVaultClient configurado para: ${this.certVaultUrl}`);
  }

  /**
   * Obtiene el certificado CSD activo de un usuario
   * @param firebaseToken Token de Firebase del usuario para autenticación
   * @returns Certificado CSD activo del usuario
   */
  async getActiveCsd(firebaseToken: string, cuentaUid?: string): Promise<CsdCertificate> {
    const serviceToken = this.configService.get<string>('VAULT_SERVICE_TOKEN');
    const useInternal = !!(cuentaUid && serviceToken);

    const url = useInternal
      ? `${this.certVaultUrl}/api/internal/csd/${encodeURIComponent(cuentaUid)}/active`
      : cuentaUid
        ? `${this.certVaultUrl}/api/certificates/csd/active?cuentaUid=${cuentaUid}`
        : `${this.certVaultUrl}/api/certificates/csd/active`;

    const headers: Record<string, string> = useInternal
      ? { 'X-Service-Token': serviceToken }
      : { 'Authorization': `Bearer ${firebaseToken}` };

    this.logger.debug(`Llamando a cert-vault (${useInternal ? 'internal' : 'bearer'}): ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<CsdCertificate>(url, { headers, timeout: 15000 })
      );

      if (!response.data) {
        throw new HttpException(
          'No se encontro un certificado CSD activo para esta cuenta.',
          HttpStatus.NOT_FOUND
        );
      }

      this.logger.debug(`Certificado CSD obtenido - Numero: ${response.data.certificateNumber}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const status = error.response?.status;
      this.logger.error(`Error obteniendo certificado CSD (status ${status ?? 'n/a'}): ${error.message}`);

      if (status === 404) {
        throw new HttpException(
          'No se encontro un certificado CSD activo para esta cuenta. Por favor, suba un certificado valido.',
          HttpStatus.NOT_FOUND
        );
      }

      // Nunca propagar 401/403 de cert-vault al frontend: el interceptor lo trataria como sesion expirada
      throw new HttpException(
        'No fue posible obtener el certificado CSD desde el servicio de certificados.',
        HttpStatus.BAD_GATEWAY
      );
    }
  }
  /**
   * Obtiene el certificado FIEL activo de un usuario
   * @param firebaseToken Token de Firebase del usuario para autenticación
   * @returns Certificado FIEL activo del usuario
   */
  async getActiveFiel(firebaseToken: string, cuentaUid?: string): Promise<FielCertificate> {
    try {
      this.logger.debug('Obteniendo certificado FIEL activo del cert-vault-service');
      
      const url = cuentaUid
          ? `${this.certVaultUrl}/api/certificates/fiel/active?cuentaUid=${cuentaUid}`
          : `${this.certVaultUrl}/api/certificates/fiel/active`;
      
      const response = await firstValueFrom(
        this.httpService.get<FielCertificate>(url, {
          headers: {
            'Authorization': `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.data) {
        throw new HttpException(
          'No se recibió respuesta del cert-vault-service',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.debug(`✅ Certificado FIEL obtenido - Número: ${response.data.certificateNumber}`);
      
      // Validar que el certificado no haya expirado
      const validUntil = new Date(response.data.validUntil);
      if (validUntil < new Date()) {
        throw new HttpException(
          `El certificado FIEL ha expirado (válido hasta ${validUntil.toLocaleDateString()})`,
          HttpStatus.BAD_REQUEST
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error('Error obteniendo certificado FIEL:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      if (error.response?.status === 404) {
        throw new HttpException(
          'No se encontró un certificado FIEL activo para este usuario. Por favor, suba un certificado válido.',
          HttpStatus.NOT_FOUND
        );
      }
      
      if (error.response?.status === 401) {
        throw new HttpException(
          'No autorizado para acceder al cert-vault-service',
          HttpStatus.BAD_GATEWAY
        );
      }

      throw new HttpException(
        `Error comunicándose con cert-vault-service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verifica la conectividad con el cert-vault-service
   * @returns true si el servicio está disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const url = `${this.certVaultUrl}/health`;
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 3000 })
      );
      
      this.logger.debug('✅ cert-vault-service está disponible');
      return response.status === 200;
    } catch (error) {
      this.logger.warn('⚠️ cert-vault-service no está disponible:', error.message);
      return false;
    }
  }

  /**
   * Obtiene la contraseña de la llave privada del CSD
   * La contraseña viene incluida en la respuesta de getActiveCsd()
   * @param firebaseToken Token de Firebase del usuario
   * @returns Contraseña de la llave privada
   */
  async getCsdPassword(firebaseToken: string, cuentaUid?: string): Promise<string> {
      try {
        // La contraseña viene en el mismo objeto del certificado
        const csdCert = await this.getActiveCsd(firebaseToken, cuentaUid);
      
      // Buscar en ambos campos posibles (password o passwordKeyfile)
      const password = csdCert.password || csdCert.passwordKeyfile;
      
      // Verificar que exista el campo password
      if (!password) {
        this.logger.error('Campos disponibles en certificado:', Object.keys(csdCert));
        throw new HttpException(
          'No se encontró la contraseña del certificado CSD',
          HttpStatus.NOT_FOUND
        );
      }
      
      this.logger.debug('✅ Contraseña del certificado obtenida correctamente');
      return password;
    } catch (error) {
      this.logger.error('Error obteniendo contraseña del CSD:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error obteniendo contraseña del certificado',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}