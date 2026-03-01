import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BranchInventory } from './entities/branch-inventory.entity';
import { CreateBranchInventoryDto } from './dto/create-branch-inventory.dto';
import { UpdateBranchInventoryDto } from './dto/update-branch-inventory.dto';
import { FilterBranchInventoryDto } from './dto/filter-branch-inventory.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class BranchInventoryService {
  private readonly logger = new Logger(BranchInventoryService.name);

  constructor(
    @InjectRepository(BranchInventory, 'inventory')
    private branchInventoryRepository: Repository<BranchInventory>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateBranchInventoryDto, firebaseUid: string): Promise<BranchInventory> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existing = await this.branchInventoryRepository.findOne({
      where: {
        userId: String(user.ID),
        branch_id: createDto.branch_id,
        product_id: createDto.product_id
      }
    });

    if (existing) {
      throw new BadRequestException('Ya existe inventario para este producto en esta sucursal');
    }

    const inventory = this.branchInventoryRepository.create({
      ...createDto,
      userId: String(user.ID),
      last_movement_date: new Date()
    });

    return await this.branchInventoryRepository.save(inventory);
  }

 async findAll(filterDto: FilterBranchInventoryDto, firebaseUid: string) {
  const user = await this.usersService.findByFirebaseUid(firebaseUid);
  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  const queryBuilder = this.branchInventoryRepository
    .createQueryBuilder('bi')
    .where('bi.userId = :userId', { userId: String(user.ID) });

  if (filterDto.branch_id) {
    queryBuilder.andWhere('bi.branch_id = :branch_id', { branch_id: filterDto.branch_id });
  }

  if (filterDto.product_id) {
    queryBuilder.andWhere('bi.product_id = :product_id', { product_id: filterDto.product_id });
  }

  if (filterDto.stock_status) {
    switch (filterDto.stock_status) {
      case 'out':
        queryBuilder.andWhere('bi.quantity = 0');
        break;
      case 'critical':
        queryBuilder.andWhere('bi.quantity > 0 AND bi.quantity < bi.min_stock * 0.5');
        break;
      case 'low':
        queryBuilder.andWhere('bi.quantity >= bi.min_stock * 0.5 AND bi.quantity < bi.min_stock');
        break;
      case 'ok':
        queryBuilder.andWhere('bi.quantity >= bi.min_stock');
        break;
    }
  }

  const items = await queryBuilder.getMany();

  // CAMBIO: SIEMPRE agregar detalles de producto y sucursal, no solo cuando hay search
  return await this.findWithProductDetails(items, filterDto.search);
}

  private async findWithProductDetails(items: BranchInventory[], search?: string) {
    const results = [];
    
    for (const item of items) {
      const productQuery = `
        SELECT p.id, p.name, p.code 
        FROM products p 
        WHERE p.id = ? AND p.active = 1
        ${search ? 'AND (p.name LIKE ? OR p.code LIKE ?)' : ''}
      `;
      
      const params = search 
        ? [item.product_id, `%${search}%`, `%${search}%`]
        : [item.product_id];

      const [product] = await this.dataSource.query(productQuery, params);
      
      if (product) {
        const branchQuery = `
          SELECT s.id, s.alias 
          FROM biz_entities_db.sucursales s 
          WHERE s.id = ?
        `;
        const [branch] = await this.dataSource.query(branchQuery, [item.branch_id]);

        results.push({
          ...item,
          product_name: product.name,
          product_code: product.code,
          branch_alias: branch?.alias || 'N/A',
          total_value: Number(item.quantity) * Number(item.cost),
          stock_status: this.getStockStatus(item)
        });
      }
    }

    return results;
  }

  private getStockStatus(item: BranchInventory): 'ok' | 'low' | 'critical' | 'out' {
    const qty = Number(item.quantity);
    const min = Number(item.min_stock);

    if (qty === 0) return 'out';
    if (qty < min * 0.5) return 'critical';
    if (qty < min) return 'low';
    return 'ok';
  }

  async findOne(id: number, firebaseUid: string): Promise<BranchInventory> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const inventory = await this.branchInventoryRepository.findOne({
      where: { id, userId: String(user.ID) }
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    return inventory;
  }

  async update(id: number, updateDto: UpdateBranchInventoryDto, firebaseUid: string): Promise<BranchInventory> {
    const inventory = await this.findOne(id, firebaseUid);
    Object.assign(inventory, updateDto);
    return await this.branchInventoryRepository.save(inventory);
  }

  async updateStock(
    branch_id: number,
    product_id: number,
    quantity: number,
    userId: string,
    operation: 'add' | 'subtract' = 'add'
  ): Promise<BranchInventory> {
    const inventory = await this.branchInventoryRepository.findOne({
      where: { userId, branch_id, product_id }
    });

    if (!inventory) {
      throw new NotFoundException(`No se encontró inventario para producto ${product_id} en sucursal ${branch_id}`);
    }

    const currentQty = Number(inventory.quantity);
    const changeQty = Number(quantity);
    const newQuantity = operation === 'add' ? currentQty + changeQty : currentQty - changeQty;

    if (newQuantity < 0) {
      throw new BadRequestException('Stock insuficiente para esta operación');
    }

    inventory.quantity = newQuantity;
    inventory.last_movement_date = new Date();

    return await this.branchInventoryRepository.save(inventory);
  }

  async getInventoryValue(branch_id: number, firebaseUid: string): Promise<number> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const items = await this.branchInventoryRepository.find({
      where: { userId: String(user.ID), branch_id }
    });

    return items.reduce((total, item) => {
      return total + (Number(item.quantity) * Number(item.cost));
    }, 0);
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const inventory = await this.findOne(id, firebaseUid);
    await this.branchInventoryRepository.remove(inventory);
  }
}
