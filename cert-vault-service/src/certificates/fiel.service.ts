import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FielCertificate, FielUsageLog } from '../entities';
import { CreateFielCertificateDto } from '../dtos';
import * as bcrypt from 'bcrypt';

@Injectable()
export class FielService {
  constructor(
    @InjectRepository(FielCertificate)
    private fielRepository: Repository<FielCertificate>,
    @InjectRepository(FielUsageLog)
    private logRepository: Repository<FielUsageLog>
  ) {}

  async create(dto: CreateFielCertificateDto, cerFile: Buffer, keyFile: Buffer) {
    // Verificar certificado existente
    const existingCert = await this.fielRepository.findOne({
      where: {
        userId: dto.userId,
        status: 'active',
      },
    });

    if (existingCert) {
      // Desactivar certificado anterior
      await this.fielRepository.update(existingCert.id, { status: 'expired' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crear nuevo certificado
    const certificate = this.fielRepository.create({
      ...dto,
      passwordHash,
      cerFile,
      keyFile,
    });

    return await this.fielRepository.save(certificate);
  }

  async findActive(userId: string) {
    const cert = await this.fielRepository.findOne({
      where: {
        userId,
        status: 'active',
      },
    });

    if (!cert) {
      throw new NotFoundException('No active FIEL certificate found');
    }

    return cert;
  }

  async logUsage(fielId: string, userId: string, action: string, details: any) {
    const log = this.logRepository.create({
      fielId,
      userId,
      actionType: action,
      status: 'success',
      ...details,
    });

    return await this.logRepository.save(log);
  }
}