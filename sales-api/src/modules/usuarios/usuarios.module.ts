import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario], 'mysql'),
  ],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}