import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
  ValidationPipe
} from '@nestjs/common';
import { DesignSettingsService } from './design-settings.service';
import { GetDesignSettingsDto } from './dto/get-design-settings.dto';
import { SaveDesignSettingDto } from './dto/save-design-setting.dto';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('design')
@UseGuards(FirebaseAuthGuard)
export class DesignSettingsController {
  private readonly logger = new Logger(DesignSettingsController.name);

  constructor(private readonly designSettingsService: DesignSettingsService) {}

  @Get('settings')
  async getSettings(@Req() req: RequestWithUser): Promise<GetDesignSettingsDto> {
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    
    this.logger.log(`Obteniendo configuración de diseño para el usuario: ${req.user.firebaseUid}`);
    return this.designSettingsService.getDesignSettings(req.user.firebaseUid);
  }

  @Post('settings')
  async saveSetting(
    @Req() req: RequestWithUser,
    @Body(new ValidationPipe()) saveDesignSettingDto: SaveDesignSettingDto,
  ): Promise<{ message: string }> {
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    
    this.logger.log(`Guardando configuración de diseño para el usuario: ${req.user.firebaseUid}`);
    await this.designSettingsService.saveDesignSetting(req.user.firebaseUid, saveDesignSettingDto);
    return { message: 'Configuración de diseño guardada exitosamente' };
  }
}