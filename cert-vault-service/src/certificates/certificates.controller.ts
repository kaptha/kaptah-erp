import { 
  Controller, 
  Post, 
  Get, 
  UseGuards, 
  UploadedFiles,
  UseInterceptors,
  Body,
  Request,
  BadRequestException,
  ParseFilePipeBuilder,
  HttpStatus
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FirebaseUser } from '../auth/interfaces/user.interface';
import { FielService } from './fiel.service';
import { CsdService } from './csd.service';
import { CreateFielCertificateDto, CreateCsdCertificateDto } from '../dtos';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiConsumes, 
  ApiOperation, 
  ApiResponse,
  ApiBody 
} from '@nestjs/swagger';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly fielService: FielService,
    private readonly csdService: CsdService,
  ) {}

  @Post('fiel')
  @ApiOperation({ summary: 'Upload FIEL certificate' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload .cer and .key files for FIEL',
    type: CreateFielCertificateDto,
  })
  @ApiResponse({ status: 201, description: 'FIEL certificate uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or data provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cer', maxCount: 1 },
    { name: 'key', maxCount: 1 },
  ]))
  async uploadFiel(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(cer|key)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024 // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    ) files: { cer: Express.Multer.File[], key: Express.Multer.File[] },
    @Body() createFielDto: CreateFielCertificateDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    if (!files.cer || !files.key) {
      throw new BadRequestException('Both .cer and .key files are required');
    }

    createFielDto.userId = user.id;
    
    return await this.fielService.create(
      createFielDto,
      files.cer[0].buffer,
      files.key[0].buffer,
    );
  }

  @Post('csd')
@ApiOperation({ summary: 'Upload CSD certificate' })
@ApiConsumes('multipart/form-data')
@UseInterceptors(FileFieldsInterceptor([
    { name: 'cer', maxCount: 1 },
    { name: 'key', maxCount: 1 },
], {
    fileFilter: (req, file, callback) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (ext === 'cer' || ext === 'key') {
            callback(null, true);
        } else {
            callback(new Error('Solo se permiten archivos .cer y .key'), false);
        }
    }
}))
async uploadCsd(
    @UploadedFiles() files: { cer: Express.Multer.File[], key: Express.Multer.File[] },
    @Body() createCsdDto: CreateCsdCertificateDto,
    @CurrentUser() user: FirebaseUser,
) {
    createCsdDto.userId = user.id;
    return await this.csdService.create(
        createCsdDto,
        files.cer[0].buffer,
        files.key[0].buffer,
    );
}

  @Get('fiel/active')
  @ApiOperation({ summary: 'Get active FIEL certificate' })
  @ApiResponse({ status: 200, description: 'Returns the active FIEL certificate' })
  @ApiResponse({ status: 404, description: 'No active FIEL certificate found' })
  async getActiveFiel(@CurrentUser() user: FirebaseUser) {
    return await this.fielService.findActive(user.id);
  }

  @Get('csd/active')
  @ApiOperation({ summary: 'Get active CSD certificate' })
  @ApiResponse({ status: 200, description: 'Returns the active CSD certificate' })
  @ApiResponse({ status: 404, description: 'No active CSD certificate found' })
  async getActiveCsd(@CurrentUser() user: FirebaseUser) {
    return await this.csdService.findActive(user.id);
  }
  @Get('csd/check')
  @ApiOperation({ summary: 'Check if user has a valid active CSD certificate' })
  @ApiResponse({ status: 200, description: 'Returns certificate validation status' })
  async checkCsd(@CurrentUser() user: FirebaseUser) {
    try {
      const isValid = await this.csdService.checkActive(user.id);
      
      return {
        valid: isValid,
        message: isValid 
          ? 'Certificado CSD válido y activo' 
          : 'No se encontró certificado CSD válido o ha expirado'
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'Error verificando certificado CSD'
      };
    }
  }
}