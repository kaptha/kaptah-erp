import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { Product } from '../product/entities/product.entity';
import { UsersService } from '../users/users.service';
import { MovementType } from './enums/movement-type.enum';

@Injectable()
export class InventoryItemService {
  private readonly logger = new Logger(InventoryItemService.name);

  constructor(
    @InjectRepository(InventoryItem, 'inventory')
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(Product, 'inventory')
    private productRepository: Repository<Product>,
    private usersService: UsersService
  ) {}

  async create(createInventoryItemDto: CreateInventoryItemDto, firebaseUid: string): Promise<InventoryItem> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener producto y validar existencia
    const product = await this.productRepository.findOne({
      where: { 
        id: createInventoryItemDto.productId,
        active: true
      }
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Calcular nuevo stock
    const previousStock = product.currentStock;
    let newStock = previousStock;

    // Usar el enum en lugar de strings
    if (createInventoryItemDto.movementType === MovementType.PURCHASE || 
        createInventoryItemDto.movementType === MovementType.RETURN ||
        createInventoryItemDto.movementType === MovementType.ADJUSTMENT ||
        createInventoryItemDto.movementType === MovementType.INITIAL) {
      newStock += createInventoryItemDto.quantity;
    } else if (createInventoryItemDto.movementType === MovementType.SALE || 
               createInventoryItemDto.movementType === MovementType.TRANSFER) {
      if (previousStock < createInventoryItemDto.quantity) {
        throw new BadRequestException('Stock insuficiente');
      }
      newStock -= createInventoryItemDto.quantity;
    }

    // Crear el movimiento
    const movement = this.inventoryItemRepository.create({
      ...createInventoryItemDto,
      userId: user.ID,
      previousStock,
      newStock
    });

    // Actualizar el stock del producto
    await this.productRepository.update(product.id, {
      currentStock: newStock
    });

    return await this.inventoryItemRepository.save(movement);
  }

  async findAll(firebaseUid: string): Promise<InventoryItem[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.inventoryItemRepository.find({
      where: { userId: user.ID },
      relations: ['product'],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number, firebaseUid: string): Promise<InventoryItem> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const movement = await this.inventoryItemRepository.findOne({
      where: { 
        id,
        userId: user.ID
      },
      relations: ['product']
    });

    if (!movement) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    return movement;
  }

  async findByProduct(productId: number, firebaseUid: string): Promise<InventoryItem[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.inventoryItemRepository.find({
      where: { 
        productId,
        userId: user.ID
      },
      relations: ['product'],
      order: { createdAt: 'DESC' }
    });
  }

  async createWithQueryRunner(
    queryRunner: QueryRunner,
    createInventoryItemDto: any,
    userId: number,
  ): Promise<any> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: createInventoryItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto con ID ${createInventoryItemDto.productId} no encontrado`,
      );
    }

    const previousStock = product.currentStock;
    let newStock = previousStock;

    switch (createInventoryItemDto.movementType) {
      case MovementType.PURCHASE:
      case MovementType.RETURN:
      case MovementType.ADJUSTMENT:
      case MovementType.INITIAL:
        newStock = previousStock + createInventoryItemDto.quantity;
        break;
      case MovementType.SALE:
      case MovementType.TRANSFER:
        newStock = previousStock - createInventoryItemDto.quantity;
        break;
      default:
        throw new BadRequestException('Tipo de movimiento no válido');
    }

    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente para el producto ${product.name}`,
      );
    }

    // Crear movimiento
    const inventoryItem = queryRunner.manager.create(InventoryItem, {
      productId: createInventoryItemDto.productId,
      movementType: createInventoryItemDto.movementType,
      quantity: createInventoryItemDto.quantity,
      previousStock,
      newStock,
      referenceType: createInventoryItemDto.referenceType,
      referenceId: createInventoryItemDto.referenceId,
      notes: createInventoryItemDto.notes,
      userId,
    });

    await queryRunner.manager.save(InventoryItem, inventoryItem);

    // Actualizar stock del producto
    await queryRunner.manager.update(
      Product,
      { id: createInventoryItemDto.productId },
      { currentStock: newStock },
    );

    return inventoryItem;
  }
}