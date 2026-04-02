import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CsdCertificate, CsdUsageLog } from '../entities';
import { CreateCsdCertificateDto } from '../dtos';
import * as bcrypt from 'bcrypt';
import * as forge from 'node-forge';


@Injectable()
export class CsdService {
  constructor(
    @InjectRepository(CsdCertificate)
    private csdRepository: Repository<CsdCertificate>,
    @InjectRepository(CsdUsageLog)
    private logRepository: Repository<CsdUsageLog>
  ) {}

  async create(dto: CreateCsdCertificateDto, cerFile: Buffer, keyFile: Buffer) {
    try {
      // Verificar certificado existente
      const existingCert = await this.csdRepository.findOne({
        where: {
          userId: dto.userId,
          status: 'active',
        },
      });

      if (existingCert) {
        await this.csdRepository.update(existingCert.id, { status: 'expired' });
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Convertir archivos a PEM y Base64
      const cerPem = await this.convertToPem(cerFile);
      const keyPem = await this.convertToPem(keyFile, dto.password);
      const cerBase64 = cerFile.toString('base64');
      const keyBase64 = keyFile.toString('base64');

      // Validar que las conversiones fueron exitosas
      if (!cerPem || !keyPem) {
        throw new BadRequestException('Error al convertir certificados a formato PEM');
      }

      // Crear nuevo certificado
      const certificate = this.csdRepository.create({
        userId: dto.userId,
        certificateNumber: dto.certificateNumber,
        serialNumber: dto.serialNumber,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        status: 'active',
        cerFile,
        keyFile,
        passwordHash,
        issuerName: dto.issuerName,
        issuerSerial: dto.issuerSerial,
        cerPem,
        keyPem,
        cerBase64,
        keyBase64
      });

      const savedCertificate = await this.csdRepository.save(certificate);

      // Registrar el log de creación
      await this.logUsage(savedCertificate.id, dto.userId, 'create', {
        status: 'success',
        actionType: 'certificate_creation'
      });

      return savedCertificate;

    } catch (error) {
      console.error('Error al crear certificado CSD:', error);
      await this.logUsage('N/A', dto.userId, 'create', {
        status: 'error',
        errorMessage: error.message,
        actionType: 'certificate_creation'
      });
      throw new BadRequestException(`Error al crear certificado CSD: ${error.message}`);
    }
  }

  private async convertToPem(file: Buffer, password?: string): Promise<string> {
  try {
    if (!file) {
      throw new Error('Archivo no proporcionado');
    }

    // Para archivos .cer (certificado)
    if (!password) {
      const base64Cert = file.toString('base64');
      const pemCert = `-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
      return pemCert;
    }

    // Para archivos .key (llave privada)
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execPromise = promisify(exec);
    
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const keyDerPath = path.join(tempDir, `key_${timestamp}.key`);
    const keyPemPath = path.join(tempDir, `key_${timestamp}.pem`);
    
    try {
      // Guardar el archivo .key (DER) temporalmente
      fs.writeFileSync(keyDerPath, file);
      
      // Convertir de DER a PEM usando openssl
      const command = `openssl pkcs8 -inform DER -in "${keyDerPath}" -passin pass:${password} -out "${keyPemPath}"`;
      await execPromise(command);
      
      // Leer el PEM generado
      const pemKey = fs.readFileSync(keyPemPath, 'utf8');
      
      // Limpiar archivos temporales
      fs.unlinkSync(keyDerPath);
      fs.unlinkSync(keyPemPath);
      
      return pemKey;
    } catch (error) {
      // Limpiar archivos en caso de error
      if (fs.existsSync(keyDerPath)) fs.unlinkSync(keyDerPath);
      if (fs.existsSync(keyPemPath)) fs.unlinkSync(keyPemPath);
      
      console.error('Error convirtiendo .key a PEM:', error);
      throw new Error(`Error convirtiendo llave privada a PEM: ${error.message}`);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw new BadRequestException(`Error en conversión: ${error.message}`);
  }
}

  async findActive(userId: string) {
    const cert = await this.csdRepository.findOne({
      where: {
        userId,
        status: 'active',
      },
    });

    if (!cert) {
      throw new NotFoundException('No active CSD certificate found');
    }

    return cert;
  }

  async logUsage(csdId: string, userId: string, action: string, details: any) {
    try {
      const log = this.logRepository.create({
        csdId,
        userId,
        actionType: action,
        status: details.status || 'success',
        ...details
      });

      return await this.logRepository.save(log);
    } catch (error) {
      console.error('Error al registrar uso de CSD:', error);
    }
    
  }
  /**
   * Verifica si el usuario tiene un certificado CSD activo y válido
   * @param userId ID del usuario
   * @returns true si tiene certificado válido y vigente
   */
  async checkActive(userId: string): Promise<boolean> {
    try {
      // Buscar certificado CSD activo del usuario
      const certificate = await this.csdRepository.findOne({
        where: {
          userId,
          status: 'active',
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!certificate) {
        return false;
      }

      // Verificar que no haya expirado
      const now = new Date();
      const validUntil = new Date(certificate.validUntil);

      if (validUntil < now) {
        // Marcar como expirado
        await this.csdRepository.update(certificate.id, { status: 'expired' });
        return false;
      }

      // Verificar que ya sea válido
      const validFrom = new Date(certificate.validFrom);
      if (validFrom > now) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verificando certificado activo:', error);
      return false;
    }
  }
}