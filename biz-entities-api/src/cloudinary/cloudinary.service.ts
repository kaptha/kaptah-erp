import { Injectable } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse, v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'logos',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      
      // Convertir buffer a stream 
      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }
  
  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }
}