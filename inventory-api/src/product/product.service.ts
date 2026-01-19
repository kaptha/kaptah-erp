import { 
  Injectable, 
  NotFoundException, 
  Logger,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Not } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product, 'inventory')
    private productsRepository: Repository<Product>,
    private usersService: UsersService,
  ) {}

  async create(createProductDto: CreateProductDto, firebaseUid: string): Promise<Product> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya existe un SKU igual para el mismo usuario
    if (createProductDto.sku) {
      const existingSku = await this.productsRepository.findOne({
        where: { 
          sku: createProductDto.sku,
          userId: user.ID,
          active: true
        }
      });

      if (existingSku) {
        throw new BadRequestException('Ya existe un producto con este SKU');
      }
    }

    const product = this.productsRepository.create({
      ...createProductDto,
      userId: user.ID,
      active: true
    });

    return await this.productsRepository.save(product);
  }

  async findAllByUser(firebaseUid: string): Promise<Product[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.productsRepository.find({
      where: { 
        userId: user.ID,
        active: true
      },
      relations: ['category']
    });
  }

  async findOne(id: number, firebaseUid: string): Promise<Product> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const product = await this.productsRepository.findOne({
      where: { 
        id,
        userId: user.ID,
        active: true
      },
      relations: ['category']
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto, firebaseUid: string): Promise<Product> {
    const product = await this.findOne(id, firebaseUid);

    // Verificar SKU único si se está actualizando
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productsRepository.findOne({
        where: { 
          sku: updateProductDto.sku,
          userId: product.userId,
          active: true,
          id: Not(id) // Excluir el producto actual de la búsqueda
        }
      });

      if (existingSku) {
        throw new BadRequestException('Ya existe un producto con este SKU');
      }
    }
    
    Object.assign(product, updateProductDto);
    
    return await this.productsRepository.save(product);
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    // Primero obtenemos el usuario
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
  
    // Luego buscamos el producto sin filtrar por active
    const product = await this.productsRepository.findOne({
      where: { 
        id,
        userId: user.ID
      }
    });
  
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
  
    if (!product.active) {
      throw new BadRequestException('El producto ya fue eliminado anteriormente');
    }
  
    product.active = false;
    await this.productsRepository.save(product);
  }

  async updateStock(id: number, quantity: number, firebaseUid: string): Promise<Product> {
    const product = await this.findOne(id, firebaseUid);
    
    const newStock = product.currentStock + quantity;
    if (newStock < 0) {
      throw new BadRequestException('Stock no puede ser negativo');
    }

    product.currentStock = newStock;
    return await this.productsRepository.save(product);
  }
}