import { Injectable, NotFoundException, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { UserEntityRelationsService } from '../user-entity-relations/user-entity-relations.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
    private userEntityRelationsService: UserEntityRelationsService,
    private usersService: UsersService
  ) {}

  async create(createSupplierDto: CreateSupplierDto, firebaseUid: string): Promise<Supplier> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No incluir Fecha_Registro - se crea automáticamente con @CreateDateColumn()
    // No incluir activo - ya tiene valor default en el entity
    const newSupplier = this.suppliersRepository.create({
      ...createSupplierDto,
      userId: user.ID
    });

    try {
      return await this.suppliersRepository.save(newSupplier);
    } catch (error) {
      this.logger.error(`Error al crear proveedor: ${error.message}`);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe un proveedor con ese email o RFC');
      }
      throw new InternalServerErrorException('Error al crear el proveedor');
    }
  }

  async findAllByRealtimeDbKey(realtimeDbKey: string): Promise<Supplier[]> {
    const user = await this.usersService.findUserByRealtimeDbKey(realtimeDbKey);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.suppliersRepository.find({ 
      where: { userId: user.ID },
      order: {
        Fecha_Registro: 'DESC'
      }
    });
  }

  async findAllByUser(firebaseUid: string): Promise<Supplier[]> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.suppliersRepository.find({ 
      where: { userId: user.ID },
      order: {
        Fecha_Registro: 'DESC'
      }
    });
  }

  async findOne(ID: number, firebaseUid: string): Promise<Supplier> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const relation = await this.userEntityRelationsService.findRelation(user.ID, ID, 'Proveedor');
    if (!relation) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const supplier = await this.suppliersRepository.findOne({ where: { ID } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({ where: { ID: id } });
    
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    try {
      // Actualizar solo los campos proporcionados
      Object.assign(supplier, updateSupplierDto);
      const updatedSupplier = await this.suppliersRepository.save(supplier);
      console.log('Proveedor actualizado en la base de datos:', updatedSupplier);
      
      return updatedSupplier;
    } catch (error) {
      this.logger.error(`Error al actualizar proveedor: ${error.message}`);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe un proveedor con ese email o RFC');
      }
      throw new InternalServerErrorException('Error al actualizar el proveedor');
    }
  }

  async remove(ID: number): Promise<void> {
    console.log(`Intentando eliminar proveedor con ID: ${ID}`);
    try {
      const result = await this.suppliersRepository.delete(ID);
      if (result.affected === 0) {
        throw new NotFoundException(`Proveedor con ID ${ID} no encontrado`);
      }
    } catch (error) {
      this.logger.error(`Error al eliminar proveedor: ${error.message}`);
      throw new InternalServerErrorException('Error al eliminar el proveedor');
    }
  }
}
