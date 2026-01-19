import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logo } from './entities/logo.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

@Injectable()
export class LogosService {
  constructor(
    @InjectRepository(Logo)
    private readonly logoRepository: Repository<Logo>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(userId: number, file: Express.Multer.File): Promise<Logo> {
    try {
      // Buscar si ya existe un logo para este usuario
      const existingLogo = await this.logoRepository.findOne({ where: { userId } });
      
      if (existingLogo) {
        // Si existe un archivo anterior, eliminarlo del sistema de archivos
        if (existingLogo.path && existsSync(existingLogo.path)) {
          try {
            await unlink(existingLogo.path);
            console.log(`Archivo anterior eliminado: ${existingLogo.path}`);
          } catch (error) {
            console.error('Error al eliminar archivo anterior:', error);
          }
        }
        
        // Actualizar la entidad existente
        existingLogo.filename = file.filename;
        existingLogo.originalName = file.originalname;
        existingLogo.mimeType = file.mimetype;
        existingLogo.size = file.size;
        existingLogo.path = file.path;
        
        return this.logoRepository.save(existingLogo);
      }
      
      // Si no existe, crear uno nuevo
      const newLogo = this.logoRepository.create({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path
      });
      
      return this.logoRepository.save(newLogo);
    } catch (error) {
      console.error('Error al crear logo:', error);
      throw new Error(`Error al guardar el logo: ${error.message}`);
    }
  }

  async findByUserId(userId: number): Promise<Logo> {
    const logo = await this.logoRepository.findOne({ where: { userId } });
    if (!logo) {
      throw new NotFoundException('Logo not found for this user');
    }
    return logo;
  }

  async remove(userId: number): Promise<void> {
    const logo = await this.logoRepository.findOne({ where: { userId } });
    if (!logo) {
      throw new NotFoundException('Logo not found for this user');
    }
    
    // Eliminar archivo del sistema de archivos
    if (logo.path && existsSync(logo.path)) {
      try {
        await unlink(logo.path);
        console.log(`Archivo eliminado: ${logo.path}`);
      } catch (error) {
        console.error('Error al eliminar archivo:', error);
      }
    }
    
    // Eliminar de Cloudinary si existe
    if (logo.publicId) {
      await this.cloudinaryService.deleteImage(logo.publicId);
    }
    
    await this.logoRepository.remove(logo);
  }
}