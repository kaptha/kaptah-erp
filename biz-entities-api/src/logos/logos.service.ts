import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logo } from './entities/logo.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class LogosService {
  constructor(
    @InjectRepository(Logo)
    private readonly logoRepository: Repository<Logo>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(userId: number, file: Express.Multer.File): Promise<Logo> {
    try {
      const existingLogo = await this.logoRepository.findOne({ where: { userId } });

      // Subir a Cloudinary
      const cloudinaryResult = await this.cloudinaryService.uploadImage(file, 'logos');
      const cloudinaryUrl = (cloudinaryResult as any).secure_url;
      const cloudinaryPublicId = (cloudinaryResult as any).public_id;

      if (existingLogo) {
        // Eliminar imagen anterior de Cloudinary
        if (existingLogo.publicId) {
          await this.cloudinaryService.deleteImage(existingLogo.publicId);
        }

        existingLogo.filename = file.originalname;
        existingLogo.originalName = file.originalname;
        existingLogo.mimeType = file.mimetype;
        existingLogo.size = file.size;
        existingLogo.path = null;
        existingLogo.url = cloudinaryUrl;
        existingLogo.publicId = cloudinaryPublicId;

        return this.logoRepository.save(existingLogo);
      }

      const newLogo = this.logoRepository.create({
        userId,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: null,
        url: cloudinaryUrl,
        publicId: cloudinaryPublicId,
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

    if (logo.publicId) {
      await this.cloudinaryService.deleteImage(logo.publicId);
    }

    await this.logoRepository.remove(logo);
  }
}
