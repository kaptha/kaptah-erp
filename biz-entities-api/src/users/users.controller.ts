import { Controller, Get, Param, Logger, Post, Put, Body, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
/**
   * Verificar si un RFC ya existe
   */
  @Get('check-rfc/:rfc')
  async checkRfc(@Param('rfc') rfc: string) {
    const exists = await this.usersService.checkRfcExists(rfc.toUpperCase());
    return { exists };
  }

  /**
   * Verificar si un email ya existe
   */
  @Get('check-email/:email')
  async checkEmail(@Param('email') email: string) {
    const exists = await this.usersService.checkEmailExists(email.toLowerCase());
    return { exists };
  }
  /**
   * Obtener usuario por Firebase UID
   */
  @Get('firebase/:firebaseUid')
  async getUserByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    this.logger.debug('📥 Solicitud de usuario por Firebase UID:', firebaseUid);
    
    try {
      const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
      
      this.logger.debug('✅ Usuario encontrado:', user.email);
      
      return {
        firebaseUid: user.firebaseUid,
        email: user.email,
        nombre: user.nombre,
        rfc: user.rfc,
        tipo_persona: user.tipo_persona
      };
    } catch (error) {
      this.logger.error('❌ Error:', error.message);
      throw error;
    }
  }
  /**
   * Endpoint para actualizar datos del usuario
   * PUT /users/update
   */
  @Put('update')
  async updateUser(@Body() updateUserDto: UpdateUserDto) {
    try {
      console.log('Received update request:', updateUserDto);
      
      // Validar que firebaseUid esté presente
      if (!updateUserDto.firebaseUid) {
        throw new HttpException('firebaseUid es requerido', HttpStatus.BAD_REQUEST);
      }

      const result = await this.usersService.updateUser(updateUserDto);
      
      return {
        success: true,
        message: 'Usuario actualizado correctamente',
        data: result
      };
    } catch (error) {
      console.error('Error in updateUser endpoint:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Error al actualizar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @Get('terminos/:firebaseUid')
async getTerminos(@Param('firebaseUid') firebaseUid: string) {
  return this.usersService.getTerminosCondiciones(firebaseUid);
}

@Put('terminos/:firebaseUid')
async updateTerminos(
  @Param('firebaseUid') firebaseUid: string,
  @Body() body: { terminos: string }
) {
  return this.usersService.updateTerminosCondiciones(firebaseUid, body.terminos);
}
}
