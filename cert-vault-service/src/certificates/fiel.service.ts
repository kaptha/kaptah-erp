import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FielCertificate, FielUsageLog } from '../entities';
import { CreateFielCertificateDto } from '../dtos';
import * as bcrypt from 'bcrypt';
import { FielCryptoService } from './fiel-crypto.service';
import { LocalFiel } from './local-fiel';

/** Metadatos públicos de la FIEL: lo único que sale al frontend y a otros servicios */
export interface FielPublicInfo {
  id: string;
  userId: string;
  rfc: string;
  certificateNumber: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  status: string;
  descargaMasivaAutorizada: boolean;
  lastUsedAt: Date | null;
}

/** Lo que necesita un firmador remoto (VaultFiel) para armar mensajes: nada secreto */
export interface FielSigningMaterial extends FielPublicInfo {
  certificatePem: string;
  certificateSerialDecimal: string;
  certificateIssuerName: string;
}

@Injectable()
export class FielService {
  constructor(
    @InjectRepository(FielCertificate)
    private fielRepository: Repository<FielCertificate>,
    @InjectRepository(FielUsageLog)
    private logRepository: Repository<FielUsageLog>,
    private readonly crypto: FielCryptoService,
  ) {}

  async create(dto: CreateFielCertificateDto, cerFile: Buffer, keyFile: Buffer): Promise<FielPublicInfo> {
    // Validar ANTES de guardar: que abra con la contraseña, que sea FIEL y no CSD, que esté vigente
    let fiel: LocalFiel;
    try {
      fiel = LocalFiel.create(cerFile, keyFile, dto.password);
    } catch (error) {
      throw new BadRequestException(`No se pudo abrir la e.firma: ${(error as Error).message}`);
    }
    if (!fiel.isFiel()) {
      throw new BadRequestException('El certificado es un CSD, no una e.firma (FIEL)');
    }
    if (!fiel.isValid()) {
      throw new BadRequestException(`La e.firma no está vigente (vence ${fiel.validTo().toISOString().slice(0, 10)})`);
    }

    const existingCert = await this.fielRepository.findOne({ where: { userId: dto.userId, status: 'active' } });
    if (existingCert) {
      await this.fielRepository.update(existingCert.id, { status: 'expired' });
    }

    const autorizada = dto.autorizarDescargaMasiva === true;
    const certificate = this.fielRepository.create({
      ...dto,
      rfc: fiel.rfc(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      passwordEncrypted: autorizada ? this.crypto.encrypt(dto.password) : null,
      descargaMasivaAutorizada: autorizada,
      cerFile,
      keyFile,
    });
    const saved = await this.fielRepository.save(certificate);
    return this.toPublic(saved);
  }

  /** Metadatos de la FIEL activa (sin llave, sin hash, sin contraseña) */
  async findActive(userId: string): Promise<FielPublicInfo> {
    return this.toPublic(await this.findActiveEntity(userId));
  }

  /** Material no secreto para que otro servicio arme mensajes firmados */
  async findSigningMaterial(userId: string): Promise<FielSigningMaterial> {
    const cert = await this.findActiveEntity(userId);
    const fiel = this.openForSigning(cert);
    return {
      ...this.toPublic(cert),
      certificatePem: fiel.certificatePem(),
      certificateSerialDecimal: fiel.certificateSerial(),
      certificateIssuerName: fiel.certificateIssuerName(),
    };
  }

  /** Firma RSA-SHA1 con la FIEL activa; la llave nunca sale de este servicio */
  async sign(userId: string, data: Buffer, context?: { requestType?: string; requestPeriod?: string }): Promise<Buffer> {
    const cert = await this.findActiveEntity(userId);
    const started = Date.now();
    try {
      const signature = this.openForSigning(cert).sign(data);
      await this.fielRepository.update(cert.id, { lastUsedAt: new Date() });
      await this.logUsage(cert.id, userId, 'SAT_DESCARGA_SIGN', {
        requestType: context?.requestType,
        requestPeriod: context?.requestPeriod,
        executionTime: Date.now() - started,
      });
      return signature;
    } catch (error) {
      await this.logUsage(cert.id, userId, 'SAT_DESCARGA_SIGN', {
        status: 'error',
        errorMessage: (error as Error).message,
        executionTime: Date.now() - started,
      });
      throw error;
    }
  }

  /** Revoca el consentimiento: borra la contraseña cifrada */
  async revokeDescargaMasiva(userId: string): Promise<void> {
    const cert = await this.findActiveEntity(userId);
    await this.fielRepository.update(cert.id, { passwordEncrypted: null, descargaMasivaAutorizada: false });
  }

  async logUsage(fielId: string, userId: string, action: string, details: Partial<FielUsageLog> = {}) {
    const log = this.logRepository.create({ fielId, userId, actionType: action, status: 'success', ...details });
    return await this.logRepository.save(log);
  }

  private async findActiveEntity(userId: string): Promise<FielCertificate> {
    const cert = await this.fielRepository.findOne({ where: { userId, status: 'active' } });
    if (!cert) {
      throw new NotFoundException('No active FIEL certificate found');
    }
    return cert;
  }

  private openForSigning(cert: FielCertificate): LocalFiel {
    if (!cert.descargaMasivaAutorizada || !cert.passwordEncrypted) {
      throw new ForbiddenException('El usuario no autorizó la descarga masiva automática con esta e.firma');
    }
    return LocalFiel.create(cert.cerFile, cert.keyFile, this.crypto.decrypt(cert.passwordEncrypted));
  }

  private toPublic(cert: FielCertificate): FielPublicInfo {
    return {
      id: cert.id,
      userId: cert.userId,
      rfc: cert.rfc,
      certificateNumber: cert.certificateNumber,
      serialNumber: cert.serialNumber,
      validFrom: cert.validFrom,
      validUntil: cert.validUntil,
      status: cert.status,
      descargaMasivaAutorizada: cert.descargaMasivaAutorizada,
      lastUsedAt: cert.lastUsedAt ?? null,
    };
  }
}
