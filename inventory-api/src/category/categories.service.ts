import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory, ServiceCategory } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UsersService } from '../users/users.service';

type CategoryResponse = {
  id: number;
  name: string;
  description?: string;
  tipo: 'producto' | 'servicio';
  active: boolean;
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(ProductCategory, 'inventory')
    private productCategoriesRepository: Repository<ProductCategory>,
    @InjectRepository(ServiceCategory, 'inventory')
    private serviceCategoriesRepository: Repository<ServiceCategory>,
    private usersService: UsersService
  ) {}

  async create(createCategoryDto: CreateCategoryDto, firebaseUid: string): Promise<CategoryResponse> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
  
    if (createCategoryDto.tipo === 'producto') {
      const newCategory = this.productCategoriesRepository.create({
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        userId: user.ID,
        active: true
      });
      const savedCategory = await this.productCategoriesRepository.save(newCategory);
      return this.mapToResponse(savedCategory, 'producto');
    } else {
      const newCategory = this.serviceCategoriesRepository.create({
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        userId: user.ID,
        active: true
      });
      const savedCategory = await this.serviceCategoriesRepository.save(newCategory);
      return this.mapToResponse(savedCategory, 'servicio');
    }
  }
  
  private mapToResponse(category: ProductCategory | ServiceCategory, tipo: 'producto' | 'servicio'): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      tipo,
      active: category.active
    };
  }

  async findAllByUser(firebaseUid: string): Promise<any[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
          
  const [productCategories, serviceCategories] = await Promise.all([
    this.productCategoriesRepository.find({
      where: { userId: user.ID, active: true }
    }),
    this.serviceCategoriesRepository.find({
      where: { userId: user.ID, active: true }
    })
  ]);

  console.log('Product Categories:', productCategories);
  console.log('Service Categories:', serviceCategories);
  
    return [
      ...productCategories.map(pc => ({
        id: pc.id,
        name: pc.name,
        description: pc.description,
        tipo: 'producto',
        active: pc.active
      })),
      ...serviceCategories.map(sc => ({
        id: sc.id,
        name: sc.name,
        description: sc.description,
        tipo: 'servicio',
        active: sc.active
      }))
    ];
  }

  async findOne(id: number, firebaseUid: string): Promise<CategoryResponse> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Buscar en ambas tablas
    const productCategory = await this.productCategoriesRepository.findOne({
      where: { id, userId: user.ID, active: true }
    });

    if (productCategory) {
      return {
        id: productCategory.id,
        name: productCategory.name,
        description: productCategory.description,
        tipo: 'producto',
        active: productCategory.active
      };
    }

    const serviceCategory = await this.serviceCategoriesRepository.findOne({
      where: { id, userId: user.ID, active: true }
    });

    if (serviceCategory) {
      return {
        id: serviceCategory.id,
        name: serviceCategory.name,
        description: serviceCategory.description,
        tipo: 'servicio',
        active: serviceCategory.active
      };
    }

    throw new NotFoundException('Categoría no encontrada');
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, firebaseUid: string): Promise<CategoryResponse> {
    const category = await this.findOne(id, firebaseUid);
    
    if (category.tipo === 'producto') {
      const updatedCategory = await this.productCategoriesRepository.save({
        id,
        name: updateCategoryDto.name,
        description: updateCategoryDto.description
      });
      return this.mapToResponse(updatedCategory, 'producto');
    } else {
      const updatedCategory = await this.serviceCategoriesRepository.save({
        id,
        name: updateCategoryDto.name,
        description: updateCategoryDto.description
      });
      return this.mapToResponse(updatedCategory, 'servicio');
    }
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const category = await this.findOne(id, firebaseUid);
    const repository = category.tipo === 'producto' 
      ? this.productCategoriesRepository 
      : this.serviceCategoriesRepository;

    await repository.update(id, { active: false });
  }
}