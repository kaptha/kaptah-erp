import { 
  Injectable, 
  NotFoundException, 
  Logger,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ServiceCategoryService {
  private readonly logger = new Logger(ServiceCategoryService.name);

  constructor(
    @InjectRepository(ServiceCategory, 'inventory')
    private serviceCategoriesRepository: Repository<ServiceCategory>,
    private usersService: UsersService
  ) {}

  async create(createServiceCategoryDto: CreateServiceCategoryDto, firebaseUid: string): Promise<ServiceCategory> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const category = this.serviceCategoriesRepository.create({
      ...createServiceCategoryDto,
      userId: user.ID,
      active: true
    });

    return await this.serviceCategoriesRepository.save(category);
  }

  async findAllByUser(firebaseUid: string): Promise<ServiceCategory[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.serviceCategoriesRepository.find({
      where: { 
        userId: user.ID,
        active: true
      }
    });
  }

  async findOne(id: number, firebaseUid: string): Promise<ServiceCategory> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const category = await this.serviceCategoriesRepository.findOne({
      where: { 
        id,
        userId: user.ID,
        active: true
      }
    });

    if (!category) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    return category;
  }

  async update(id: number, updateServiceCategoryDto: UpdateServiceCategoryDto, firebaseUid: string): Promise<ServiceCategory> {
    const category = await this.findOne(id, firebaseUid);
    
    Object.assign(category, updateServiceCategoryDto);
    
    return await this.serviceCategoriesRepository.save(category);
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const category = await this.findOne(id, firebaseUid);
    
    // Soft delete
    category.active = false;
    await this.serviceCategoriesRepository.save(category);
  }
}
