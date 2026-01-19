import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario, 'mysql')
    private usuariosRepository: Repository<Usuario>,
  ) {
    console.log('✅ UsuariosService inicializado con conexión MySQL');
  }

  async findByFirebaseUid(firebaseUid: string): Promise<Usuario> {
    console.log('🔍 Buscando usuario con firebaseUid:', firebaseUid);
    
    try {
      const usuario = await this.usuariosRepository.findOne({
        where: { firebaseUid },
      });

      console.log('📊 Usuario encontrado:', usuario);

      if (!usuario) {
        console.log('❌ Usuario NO encontrado en MySQL');
        throw new NotFoundException(
          `Usuario con firebaseUid ${firebaseUid} no encontrado`
        );
      }

      console.log('✅ Datos del usuario:', {
        ID: usuario.ID,
        Nombre: usuario.Nombre,
        nombreComercial: usuario.nombreComercial,
        rfc: usuario.rfc,
        Email: usuario.Email,
      });

      return usuario;
    } catch (error) {
      console.error('❌ Error al buscar usuario:', error.message);
      throw error;
    }
  }

  async getDatosParaTemplate(firebaseUid: string) {
    console.log('📝 Obteniendo datos para template, firebaseUid:', firebaseUid);
    
    try {
      const usuario = await this.findByFirebaseUid(firebaseUid);

      const datos = {
        sucursal_nombre: usuario.nombreComercial || usuario.Nombre,
        empresa_rfc: usuario.rfc || 'XAXX010101000',
        empresa_regimen_fiscal: usuario.fiscalReg || '',
        empresa_tipo_persona: usuario.tipo_persona || 'Física',
        empresa_telefono: usuario.telefono || '',
        empresa_email: usuario.Email,
        es_persona_fisica: usuario.tipo_persona === 'Física',
        // 👇 NUEVO: Agregar términos y condiciones de cotización
        terminos_condiciones_cotizacion: usuario.terminos_condiciones_cotizacion || null,
      };

      console.log('✅ Datos preparados para template:', datos);
      return datos;
    } catch (error) {
      console.error('❌ Error en getDatosParaTemplate:', error.message);
      // Retornar valores por defecto si falla
      return {
        sucursal_nombre: 'Mi Empresa',
        empresa_rfc: 'XAXX010101000',
        empresa_regimen_fiscal: '',
        empresa_tipo_persona: 'Física',
        empresa_telefono: '',
        empresa_email: '',
        es_persona_fisica: true,
        terminos_condiciones_cotizacion: null, // 👈 NUEVO: Valor por defecto
      };
    }
  }
}