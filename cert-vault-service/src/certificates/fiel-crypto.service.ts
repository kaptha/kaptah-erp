import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado reversible de la contraseña de la FIEL para descarga masiva automática.
 * AES-256-GCM con VAULT_ENCRYPTION_KEY (32 bytes en base64, solo en variables de Railway).
 * Formato almacenado: v1:<iv b64>:<tag b64>:<cipher b64>
 */
@Injectable()
export class FielCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('VAULT_ENCRYPTION_KEY') ?? '';
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('VAULT_ENCRYPTION_KEY debe ser 32 bytes en base64 (openssl rand -base64 32)');
    }
    this.key = key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  decrypt(stored: string): string {
    const [version, ivB64, tagB64, encB64] = stored.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !encB64) {
      throw new Error('Formato de contraseña cifrada inválido');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
  }
}
