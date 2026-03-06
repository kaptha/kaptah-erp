import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BranchTransfer, TransferStatus } from './entities/branch-transfer.entity';
import { BranchTransferItem } from './entities/branch-transfer-item.entity';
import { CreateBranchTransferDto } from './dto/create-branch-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { FilterBranchTransferDto } from './dto/filter-branch-transfer.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class BranchTransferService {
  private readonly logger = new Logger(BranchTransferService.name);

  constructor(
    @InjectRepository(BranchTransfer, 'inventory')
    private branchTransferRepository: Repository<BranchTransfer>,
    @InjectRepository(BranchTransferItem, 'inventory')
    private transferItemRepository: Repository<BranchTransferItem>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  // ==================== HELPERS ====================

  private async getUserId(firebaseUid: string): Promise<string> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return String(user.ID);
  }

  private async generateTransferNumber(userId: string): Promise<string> {
    const count = await this.branchTransferRepository.count({
      where: { userId }
    });
    const num = (count + 1).toString().padStart(6, '0');
    return `TRF-${num}`;
  }

  private async enrichTransfer(transfer: BranchTransfer) {
    // Obtener alias de sucursales
    const inventoryManager = this.branchTransferRepository.manager;

    const fromBranchResult = await inventoryManager.query(
      'SELECT s.id, s.alias FROM sucursales s WHERE s.id = ?',
      [transfer.from_branch_id]
    );
    const toBranchResult = await inventoryManager.query(
      'SELECT s.id, s.alias FROM sucursales s WHERE s.id = ?',
      [transfer.to_branch_id]
    );

    // Enriquecer items con nombre de producto
    const itemsWithDetails = [];
    if (transfer.items && transfer.items.length > 0) {
      for (const item of transfer.items) {
        const products = await inventoryManager.query(
          'SELECT p.id, p.name, p.sku as code FROM products p WHERE p.id = ?',
          [item.product_id]
        );
        const product = products[0];
        itemsWithDetails.push({
          ...item,
          product_name: product?.name || 'N/A',
          product_code: product?.code || 'N/A'
        });
      }
    }

    return {
      ...transfer,
      items: itemsWithDetails,
      from_branch_alias: fromBranchResult[0]?.alias || 'N/A',
      to_branch_alias: toBranchResult[0]?.alias || 'N/A',
      total_items: itemsWithDetails.length,
      total_value: itemsWithDetails.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.cost)), 0
      )
    };
  }

  // ==================== FIND ALL ====================

  async findAll(filterDto: FilterBranchTransferDto, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const queryBuilder = this.branchTransferRepository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.items', 'items')
      .where('bt.userId = :userId', { userId });

    if (filterDto.from_branch_id) {
      queryBuilder.andWhere('bt.from_branch_id = :from_branch_id', {
        from_branch_id: filterDto.from_branch_id,
      });
    }

    if (filterDto.to_branch_id) {
      queryBuilder.andWhere('bt.to_branch_id = :to_branch_id', {
        to_branch_id: filterDto.to_branch_id,
      });
    }

    if (filterDto.status) {
      queryBuilder.andWhere('bt.status = :status', { status: filterDto.status });
    }

    queryBuilder.orderBy('bt.created_at', 'DESC');

    const transfers = await queryBuilder.getMany();

    const result = [];
    for (const transfer of transfers) {
      result.push(await this.enrichTransfer(transfer));
    }

    return result;
  }

  // ==================== FIND ONE ====================

  async findOne(id: number, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.items', 'items')
      .where('bt.id = :id', { id })
      .andWhere('bt.userId = :userId', { userId })
      .getOne();

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    return this.enrichTransfer(transfer);
  }

  // ==================== CREATE ====================

  async create(createDto: CreateBranchTransferDto, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    if (createDto.from_branch_id === createDto.to_branch_id) {
      throw new BadRequestException('La sucursal origen y destino no pueden ser la misma');
    }

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('La transferencia debe tener al menos un producto');
    }

    const transferNumber = await this.generateTransferNumber(userId);

    // Crear la transferencia
    const transfer = this.branchTransferRepository.create({
      userId,
      transfer_number: transferNumber,
      from_branch_id: createDto.from_branch_id,
      to_branch_id: createDto.to_branch_id,
      requested_by: createDto.userId || 'Sistema',
      notes: createDto.notes || null,
      status: 'pending' as TransferStatus,
    });

    const savedTransfer = await this.branchTransferRepository.save(transfer);

    // Crear los items
    for (const itemDto of createDto.items) {
      const item = this.transferItemRepository.create({
        transfer_id: savedTransfer.id,
        product_id: itemDto.product_id,
        quantity: itemDto.quantity,
        cost: itemDto.cost || 0,
        notes: itemDto.notes || null,
      });
      await this.transferItemRepository.save(item);
    }

    this.logger.log(`Transferencia ${transferNumber} creada por usuario ${userId}`);

    return this.findOne(savedTransfer.id, firebaseUid);
  }

  // ==================== APPROVE ====================

  async approveTransfer(id: number, approved_by: string, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository.findOne({
      where: { id, userId }
    });

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Solo se pueden aprobar transferencias pendientes');
    }

    transfer.status = 'in_transit';
    transfer.approved_by = approved_by;
    transfer.shipped_date = new Date();

    await this.branchTransferRepository.save(transfer);

    this.logger.log(`Transferencia #${id} aprobada por ${approved_by}`);

    return this.findOne(id, firebaseUid);
  }

  // ==================== COMPLETE ====================

  async completeTransfer(id: number, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.items', 'items')
      .where('bt.id = :id', { id })
      .andWhere('bt.userId = :userId', { userId })
      .getOne();

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    if (transfer.status !== 'pending' && transfer.status !== 'in_transit') {
      throw new BadRequestException('Solo se pueden completar transferencias pendientes o en tránsito');
    }

    // Actualizar inventario: restar de origen, sumar a destino
    if (transfer.items && transfer.items.length > 0) {
      const inventoryManager = this.branchTransferRepository.manager;

      for (const item of transfer.items) {
        // Restar del inventario de origen
        await inventoryManager.query(
          `UPDATE branch_inventory 
           SET quantity = quantity - ?, last_movement_date = NOW(), updated_at = NOW() 
           WHERE branch_id = ? AND product_id = ? AND userId = ?`,
          [item.quantity, transfer.from_branch_id, item.product_id, userId]
        );

        // Verificar si existe inventario en destino
        const existingInventory = await inventoryManager.query(
          `SELECT id FROM branch_inventory 
           WHERE branch_id = ? AND product_id = ? AND userId = ?`,
          [transfer.to_branch_id, item.product_id, userId]
        );

        if (existingInventory.length > 0) {
          // Sumar al inventario de destino
          await inventoryManager.query(
            `UPDATE branch_inventory 
             SET quantity = quantity + ?, last_movement_date = NOW(), updated_at = NOW() 
             WHERE branch_id = ? AND product_id = ? AND userId = ?`,
            [item.quantity, transfer.to_branch_id, item.product_id, userId]
          );
        } else {
          // Crear registro de inventario en destino
          await inventoryManager.query(
            `INSERT INTO branch_inventory (userId, branch_id, product_id, quantity, min_stock, max_stock, cost, last_movement_date, created_at, updated_at) 
             VALUES (?, ?, ?, ?, 0, NULL, ?, NOW(), NOW(), NOW())`,
            [userId, transfer.to_branch_id, item.product_id, item.quantity, item.cost]
          );
        }
      }
    }

    transfer.status = 'completed';
    transfer.received_date = new Date();
    await this.branchTransferRepository.save(transfer);

    this.logger.log(`Transferencia #${id} completada. Inventario actualizado.`);

    return this.findOne(id, firebaseUid);
  }

  // ==================== CANCEL ====================

  async cancelTransfer(id: number, reason: string, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository.findOne({
      where: { id, userId }
    });

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    if (transfer.status === 'completed') {
      throw new BadRequestException('No se puede cancelar una transferencia completada');
    }

    transfer.status = 'cancelled';
    transfer.notes = reason ? `${transfer.notes || ''}\nCancelada: ${reason}`.trim() : transfer.notes;

    await this.branchTransferRepository.save(transfer);

    this.logger.log(`Transferencia #${id} cancelada. Motivo: ${reason}`);

    return this.findOne(id, firebaseUid);
  }

  // ==================== UPDATE STATUS ====================

  async updateTransferStatus(id: number, updateStatusDto: UpdateTransferStatusDto, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository.findOne({
      where: { id, userId }
    });

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    transfer.status = updateStatusDto.status as TransferStatus;

    if (updateStatusDto.approved_by) {
      transfer.approved_by = updateStatusDto.approved_by;
    }

    if (updateStatusDto.notes) {
      transfer.notes = updateStatusDto.notes;
    }

    await this.branchTransferRepository.save(transfer);

    return this.findOne(id, firebaseUid);
  }

  // ==================== REMOVE ====================

  async remove(id: number, firebaseUid: string) {
    const userId = await this.getUserId(firebaseUid);

    const transfer = await this.branchTransferRepository.findOne({
      where: { id, userId }
    });

    if (!transfer) {
      throw new NotFoundException(`Transferencia #${id} no encontrada`);
    }

    if (transfer.status !== 'cancelled') {
      throw new BadRequestException('Solo se pueden eliminar transferencias canceladas');
    }

    // Eliminar items primero
    await this.transferItemRepository.delete({ transfer_id: id });

    // Eliminar transferencia
    await this.branchTransferRepository.remove(transfer);

    this.logger.log(`Transferencia #${id} eliminada`);

    return { message: 'Transferencia eliminada correctamente' };
  }
}
