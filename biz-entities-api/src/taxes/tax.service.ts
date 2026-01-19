import { Injectable, NotFoundException, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { Tax } from './entities/tax.entity';
import { UserEntityRelationsService } from '../user-entity-relations/user-entity-relations.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  
  constructor(
    @InjectRepository(Tax)
    private taxRepository: Repository<Tax>,
    private userEntityRelationsService: UserEntityRelationsService,
    private usersService: UsersService
  ) {}

  async create(createTaxDto: CreateTaxDto, firebaseUid: string): Promise<Tax> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newTax = this.taxRepository.create({
      ...createTaxDto,
      userId: user.ID
    });

    return await this.taxRepository.save(newTax);
  }

  async findAllByRealtimeDbKey(realtimeDbKey: string): Promise<Tax[]> {
    const user = await this.usersService.findUserByRealtimeDbKey(realtimeDbKey);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.taxRepository.find({ where: { userId: user.ID } });
  }

  async findAllByUser(firebaseUid: string): Promise<Tax[]> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.taxRepository.find({ where: { userId: user.ID } });
  }

  async findOne(id: number, firebaseUid: string): Promise<Tax> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const relation = await this.userEntityRelationsService.findRelation(user.ID, id, 'Impuesto');
    if (!relation) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }
    return tax;
  }

  async update(id: number, updateTaxDto: UpdateTaxDto): Promise<Tax> {
    const tax = await this.taxRepository.findOne({ where: { id: id } });
    
    if (!tax) {
      throw new NotFoundException(`Impuesto con ID ${id} no encontrado`);
    }

    Object.assign(tax, updateTaxDto);

    const updatedTax = await this.taxRepository.save(tax);
    this.logger.log('Impuesto actualizado en la base de datos:', updatedTax);
    
    return updatedTax;
  }

  async remove(ID: number): Promise<void> {
    this.logger.log(`Intentando eliminar impuesto con ID: ${ID}`);
    const result = await this.taxRepository.delete(ID);
    if (result.affected === 0) {
      throw new NotFoundException(`Impuesto con ID ${ID} no encontrado`);
    }
  }
}
