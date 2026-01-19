import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
interface LogoResponse {
  filename: string;
  url: string;
  type: string;
  size: number;
}
@Injectable()
export class LogoClientService {
  private readonly logger = new Logger(LogoClientService.name);
  private readonly bizEntitiesUrl = 'http://localhost:3000/api';

  /**
   * Obtener URL del logo del usuario
   */
  async getLogoUrl(idToken: string): Promise<string | null> {
    try {
      const response = await axios.get<LogoResponse>( // <-- Tipar aquí
        `${this.bizEntitiesUrl}/logos/current`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.data && response.data.url) {
        this.logger.log(`✅ Logo obtenido: ${response.data.url}`);
        return response.data.url;
      }

      return null;
    } catch (error: any) { // <-- Tipar error también
      if (error.response?.status === 404) {
        this.logger.warn('Usuario no tiene logo configurado');
        return null;
      }
      
      this.logger.error(`Error obteniendo logo: ${error.message}`);
      return null;
    }
  }
}