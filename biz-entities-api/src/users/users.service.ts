import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPostgres } from './entities/user.postgres.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserPostgres, 'postgres')
    private usersPostgresRepository: Repository<UserPostgres>,
  ) {}
  
  async findUserByRealtimeDbKey(realtimeDbKey: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { realtimeDbKey } });
  }
  
  async findUserByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    console.log('Attempting to create user:', createUserDto);
    try {
      // Asegurar que tipo_persona tenga un valor por defecto si no viene
      const userData = {
        ...createUserDto,
        tipo_persona: createUserDto.tipo_persona || 'fisica' as 'fisica' | 'moral'
      };

      // Crear usuario en MySQL
      const newUser = this.usersRepository.create(userData);
      const savedUser = await this.usersRepository.save(newUser);
      console.log('User saved successfully to MySQL:', savedUser);
      
      try {
        // Filtrar solo los campos que existen en la tabla PostgreSQL
        const pgUserData = {
          firebaseUid: createUserDto.firebaseUid,
          realtimeDbKey: createUserDto.realtimeDbKey,
          nombre: createUserDto.nombre,
          email: createUserDto.email
        };
        
        console.log('Creating PostgreSQL user with data:', pgUserData);
        const newUserPostgres = this.usersPostgresRepository.create(pgUserData);
        const savedPgUser = await this.usersPostgresRepository.save(newUserPostgres);
        console.log('User successfully saved to PostgreSQL:', savedPgUser);
      } catch (pgError) {
        console.error('Error saving to PostgreSQL:', pgError);
        // No relanzo el error para que no afecte al flujo principal
      }
      
      return savedUser;
    } catch (error) {
      console.error('Error in create method:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar datos del usuario en MySQL y PostgreSQL
   */
  async updateUser(updateUserDto: UpdateUserDto): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('Attempting to update user:', updateUserDto);
    
    const { firebaseUid, nombre, nombreComercial, phone, rfc, tipoPersona, fiscalReg, email } = updateUserDto;

    try {
      // 1. Buscar usuario en MySQL por firebaseUid
      const userMySQL = await this.usersRepository.findOne({ where: { firebaseUid } });
      
      if (!userMySQL) {
        throw new NotFoundException(`Usuario con firebaseUid ${firebaseUid} no encontrado en MySQL`);
      }

      // 2. Actualizar datos en MySQL
      userMySQL.nombre = nombre;
      userMySQL.nombreComercial = nombreComercial || null;
      userMySQL.telefono = phone;
      userMySQL.tipo_persona = (tipoPersona || 'fisica') as 'fisica' | 'moral';
      userMySQL.rfc = rfc.toUpperCase();
      userMySQL.fiscalReg = fiscalReg;
      userMySQL.email = email;

      const updatedUserMySQL = await this.usersRepository.save(userMySQL);
      console.log('✅ User updated successfully in MySQL:', updatedUserMySQL);

      return {
        success: true,
        message: 'Datos actualizados correctamente',
        data: updatedUserMySQL
      };

    } catch (error) {
      console.error('❌ Error in updateUser method:', error);
      throw error;
    }
  }
  /**
 * Obtener términos y condiciones del usuario
 */
async getTerminosCondiciones(firebaseUid: string): Promise<{ terminos: string }> {
  const user = await this.usersRepository.findOne({ where: { firebaseUid } });
  
  if (!user) {
    throw new NotFoundException(`Usuario con firebaseUid ${firebaseUid} no encontrado`);
  }

  return {
    terminos: user.terminos_condiciones_cotizacion || ''
  };
}

/**
 * Actualizar términos y condiciones del usuario
 */
async updateTerminosCondiciones(
  firebaseUid: string, 
  terminos: string
): Promise<{ success: boolean; message: string }> {
  console.log('Actualizando términos para usuario:', firebaseUid);
  
  try {
    const user = await this.usersRepository.findOne({ where: { firebaseUid } });
    
    if (!user) {
      throw new NotFoundException(`Usuario con firebaseUid ${firebaseUid} no encontrado`);
    }

    user.terminos_condiciones_cotizacion = terminos;
    await this.usersRepository.save(user);

    console.log('✅ Términos actualizados correctamente');
    return {
      success: true,
      message: 'Términos y condiciones actualizados correctamente'
    };
  } catch (error) {
    console.error('❌ Error al actualizar términos:', error);
    throw error;
  }
}
}
