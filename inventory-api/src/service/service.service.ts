import { 
  Injectable, 
  NotFoundException, 
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    @InjectRepository(Service, 'inventory')
    private servicesRepository: Repository<Service>,
    private usersService: UsersService,
  ) {}

  async create(createServiceDto: CreateServiceDto, firebaseUid: string): Promise<Service> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const service = this.servicesRepository.create({
      ...createServiceDto,
      userId: user.ID,
      active: true
    });

    return await this.servicesRepository.save(service);
  }

  async findAllByUser(firebaseUid: string): Promise<Service[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.servicesRepository.find({
      where: { 
        userId: user.ID,
        active: true
      },
      relations: ['category']
    });
  }

  async findOne(id: number, firebaseUid: string): Promise<Service> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const service = await this.servicesRepository.findOne({
      where: { 
        id,
        userId: user.ID,
        active: true
      },
      relations: ['category']
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    return service;
  }

  async update(id: number, updateServiceDto: UpdateServiceDto, firebaseUid: string): Promise<Service> {
    const service = await this.findOne(id, firebaseUid);
    
    Object.assign(service, updateServiceDto);
    
    return await this.servicesRepository.save(service);
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const service = await this.findOne(id, firebaseUid);
    
    // Soft delete
    service.active = false;
    await this.servicesRepository.save(service);
  }
}