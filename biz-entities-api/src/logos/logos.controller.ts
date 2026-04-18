import {
  Controller,
  Get,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpStatus,
  NotFoundException,
  UseGuards,
  Logger,
  Param,
  Query
} from '@nestjs/common';
import { existsSync, accessSync, constants } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { resolve, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { LogosService } from './logos.service';
import { Request, Response } from 'express';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { Public } from '../decorators/public.decorator';
import { UsersService } from '../users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('logos')
@UseGuards(FirebaseAuthGuard)
export class LogosController {
  private readonly logger = new Logger(LogosController.name);

  constructor(
    private readonly logosService: LogosService,
    private readonly usersService: UsersService
  ) {}

 @Get('current')
  async getCurrentLogo(@Req() req: RequestWithUser, @Res() res: Response, @Query('cuentaUid') cuentaUid?: string) {
    try {
      if (!req.user || !req.user.firebaseUid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'No se pudo obtener el UID de Firebase del usuario',
        });
      }
      const uidToUse = cuentaUid || req.user.firebaseUid;
      const user = await this.usersService.findUserByFirebaseUid(uidToUse);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Usuario no encontrado en la base de datos',
        });
      }

      try {
        const logo = await this.logosService.findByUserId(user.ID);
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const url = logo.url || `${baseUrl}/api/logos/file/${logo.filename}`;
        
        return res.status(HttpStatus.OK).json({
          filename: logo.originalName,
          url: url,
          type: logo.mimeType,
          size: logo.size,
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          return res.status(HttpStatus.NOT_FOUND).json({
            message: 'No se encontró logo para este usuario',
          });
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error al obtener logo: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error al obtener el logo',
        error: error.message,
      });
    }
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Formato de archivo no soportado. Solo PNG, JPG, y SVG son permitidos.'), false);
        }
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File, 
    @Req() req: RequestWithUser, 
    @Res() res: Response
  ) {
    try {
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Se requiere un archivo de imagen',
        });
      }

      if (!req.user || !req.user.firebaseUid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'No se pudo obtener el UID de Firebase del usuario',
        });
      }
      
      const user = await this.usersService.findUserByFirebaseUid(req.user.firebaseUid);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Usuario no encontrado en la base de datos',
        });
      }

      this.logger.log(`📁 Guardando archivo: ${file.filename}`);
      
      const logo = await this.logosService.create(user.ID, file);
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = logo.url || `${baseUrl}/api/logos/file/${logo.filename}`;
      
      this.logger.log(`✅ Logo guardado: ${logo.filename}`);
      
      return res.status(HttpStatus.CREATED).json({
        message: 'Logo subido exitosamente',
        filename: logo.originalName,
        url: url
      });
    } catch (error) {
      this.logger.error(`Error al subir logo: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error al guardar el logo',
        error: error.message,
      });
    }
  }

  @Delete('current')
  async deleteLogo(@Req() req: RequestWithUser, @Res() res: Response) {
    try {
      if (!req.user || !req.user.firebaseUid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'No se pudo obtener el UID de Firebase del usuario',
        });
      }
      
      const user = await this.usersService.findUserByFirebaseUid(req.user.firebaseUid);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Usuario no encontrado en la base de datos',
        });
      }

      try {
        await this.logosService.remove(user.ID);
        
        return res.status(HttpStatus.OK).json({
          message: 'Logo eliminado exitosamente',
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          return res.status(HttpStatus.NOT_FOUND).json({
            message: 'No se encontró logo para este usuario',
          });
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error al eliminar logo: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error al eliminar el logo',
        error: error.message,
      });
    }
  }

  @Public()
  @Get('file/:filename')
  getFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const fs = require('fs');
      
      this.logger.log(`📁 Archivo solicitado: "${filename}"`);
      
      // Directorio de logos
      const uploadsDir = resolve(process.cwd(), 'uploads', 'logos');
      this.logger.log(`📂 Directorio: ${uploadsDir}`);
      this.logger.log(`📂 process.cwd(): ${process.cwd()}`);
      
      // Verificar que el directorio existe
      if (!existsSync(uploadsDir)) {
        this.logger.error(`❌ Directorio no existe: ${uploadsDir}`);
        
        // Intentar crear el directorio
        try {
          fs.mkdirSync(uploadsDir, { recursive: true });
          this.logger.log(`✅ Directorio creado: ${uploadsDir}`);
        } catch (mkdirErr) {
          this.logger.error(`❌ Error al crear directorio: ${mkdirErr.message}`);
        }
        
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Directorio de logos no encontrado'
        });
      }
      
      // Listar archivos
      let files = [];
      try {
        files = fs.readdirSync(uploadsDir);
        this.logger.log(`📂 Archivos (${files.length}): ${files.join(', ')}`);
      } catch (readErr) {
        this.logger.error(`❌ Error al leer directorio: ${readErr.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Error al leer directorio de logos'
        });
      }
      
      if (files.length === 0) {
        this.logger.warn(`⚠️ El directorio está vacío`);
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No hay logos en el directorio'
        });
      }
      
      // Buscar el archivo ignorando mayúsculas/minúsculas y espacios
      const filenameLower = filename.toLowerCase().trim();
      const matchedFile = files.find((f: string) => 
        f.toLowerCase().trim() === filenameLower
      );
      
      if (!matchedFile) {
        this.logger.error(`❌ Archivo no encontrado en lista`);
        this.logger.log(`🔍 Buscando: "${filenameLower}"`);
        this.logger.log(`🔍 Archivos disponibles: ${files.map((f: string) => `"${f.toLowerCase().trim()}"`).join(', ')}`);
        
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Logo no encontrado',
          requestedFile: filename,
          availableFiles: files
        });
      }
      
      this.logger.log(`✅ Archivo encontrado: "${matchedFile}"`);
      
      // Construir path con el nombre exacto del archivo
      const filePath = resolve(uploadsDir, matchedFile);
      this.logger.log(`📁 Path completo: ${filePath}`);
      
      // Verificar acceso
      try {
        accessSync(filePath, constants.F_OK | constants.R_OK);
        this.logger.log(`✅ Archivo accesible`);
      } catch (err) {
        this.logger.error(`❌ No se puede acceder: ${err.message}`);
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No se puede acceder al archivo'
        });
      }
      
      // Content-Type
      const ext = extname(matchedFile).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };
      
      // Headers
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // Enviar archivo
      this.logger.log(`📤 Enviando archivo...`);
      return res.sendFile(filePath, (err) => {
        if (err) {
          this.logger.error(`❌ Error al enviar: ${err.message}`);
        } else {
          this.logger.log(`✅ Enviado exitosamente`);
        }
      });
    } catch (error) {
      this.logger.error(`❌ Error general: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error al obtener el archivo',
        error: error.message
      });
    }
  }
}

