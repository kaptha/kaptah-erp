import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BranchTransfer } from './entities/branch-transfer.entity';
import { BranchTransferItem } from './entities/branch-transfer-item.entity';
import { CreateBranchTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { FilterBranchTransferDto } from './dto/filter-transfer.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class BranchTransferService {
  private readonly logger = new Logger(BranchTransferService.name);

  constructor(
    @InjectRepository(BranchTransfer, 'inventory')
    private transferRepository: Repository<BranchTransfer>,
    @InjectRepository(BranchTransferItem, 'inventory')
    private transferItemRepository: Repository<BranchTransferItem>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateBranchTransferDto, firebaseUid: string): Promise<BranchTransfer> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (createDto.from_branch_id === createDto.to_branch_id) {
      throw new BadRequestException('No se puede transferir a la misma sucursal');
    }

    const transferNumber = await this.generateTransferNumber(String(user.ID));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transfer = this.transferRepository.create({
        userId: String(user.ID),
        transfer_number: transferNumber,
        from_branch_id: createDto.from_branch_id,
        to_branch_id: createDto.to_branch_id,
        notes: createDto.notes,
        requested_by: firebaseUid,
        status: 'pending'
      });

      const savedTransfer = await queryRunner.manager.save(transfer);

      for (const item of createDto.items) {
        const transferItem = this.transferItemRepository.create({
          transfer_id: savedTransfer.id,
          product_id: item.product_id,
          quantity: item.quantity,
          cost: item.cost || 0,
          notes: item.notes
        });

        await queryRunner.manager.save(transferItem);
      }

      await queryRunner.commitTransaction();
      return savedTransfer;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating transfer: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateTransferNumber(userId: string): Promise<string> {
    const count = await this.transferRepository.count({ where: { userId } });
    const number = (count + 1).toString().padStart(6, '0');
    return `TRANS-${number}`;
  }

  async findAll(filterDto: FilterBranchTransferDto, firebaseUid: string) {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const queryBuilder = this.transferRepository
      .createQueryBuilder('bt')
      .where('bt.userId = :userId', { userId: String(user.ID) });

    if (filterDto.status) {
      queryBuilder.andWhere('bt.status = :status', { status: filterDto.status });
    }

    if (filterDto.from_branch_id) {
      queryBuilder.andWhere('bt.from_branch_id = :from_branch_id', { from_branch_id: filterDto.from_branch_id });
    }

    if (filterDto.to_branch_id) {
      queryBuilder.andWhere('bt.to_branch_id = :to_branch_id', { to_branch_id: filterDto.to_branch_id });
    }

    if (filterDto.date_from) {
      queryBuilder.andWhere('bt.created_at >= :date_from', { date_from: filterDto.date_from });
    }

    if (filterDto.date_to) {
      queryBuilder.andWhere('bt.created_at <= :date_to', { date_to: filterDto.date_to });
    }

    queryBuilder.orderBy('bt.created_at', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(id: number, firebaseUid: string) {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const transfer = await this.transferRepository.findOne({
      where: { id, userId: String(user.ID) }
    });

    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    const items = await this.transferItemRepository.find({
      where: { transfer_id: transfer.id }
    });

    const [fromBranch] = await this.dataSource.query(
      'SELECT alias FROM biz_entities_db.sucursales WHERE id = ?',
      [transfer.from_branch_id]
    );

    const [toBranch] = await this.dataSource.query(
      'SELECT alias FROM biz_entities_db.sucursales WHERE id = ?',
      [transfer.to_branch_id]
    );

    return {
      ...transfer,
      items,
      from_branch_alias: fromBranch?.alias || 'N/A',
      to_branch_alias: toBranch?.alias || 'N/A',
      total_products: items.length,
      total_value: items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.cost)), 0)
    };
  }

  async updateStatus(
    id: number,
    updateDto: UpdateTransferStatusDto,
    firebaseUid: string
  ): Promise<BranchTransfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id }
    });

    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    if (updateDto.status === 'completed' && transfer.status !== 'completed') {
      await this.completeTransfer(transfer, firebaseUid);
    }

    transfer.status = updateDto.status;
    
    if (updateDto.approved_by) {
      transfer.approved_by = updateDto.approved_by;
    }

    if (updateDto.status === 'in_transit' && !transfer.shipped_date) {
      transfer.shipped_date = new Date();
    }

    if (updateDto.status === 'completed' && !transfer.received_date) {
      transfer.received_date = new Date();
    }

    if (updateDto.notes) {
      transfer.notes = updateDto.notes;
    }

    return await this.transferRepository.save(transfer);
  }

  private async completeTransfer(transfer: BranchTransfer, firebaseUid: string) {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const items = await this.transferItemRepository.find({
      where: { transfer_id: transfer.id }
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        const [originInventory] = await queryRunner.query(
          'SELECT * FROM branch_inventory WHERE userId = ? AND branch_id = ? AND product_id = ?',
          [String(user.ID), transfer.from_branch_id, item.product_id]
        );

        if (!originInventory) {
          throw new BadRequestException(`Producto ${item.product_id} no encontrado en sucursal origen`);
        }

        if (Number(originInventory.quantity) < Number(item.quantity)) {
          throw new BadRequestException(`Stock insuficiente para producto ${item.product_id} en sucursal origen`);
        }

        await queryRunner.query(
          'UPDATE branch_inventory SET quantity = quantity - ?, last_movement_date = NOW() WHERE userId = ? AND branch_id = ? AND product_id = ?',
          [item.quantity, String(user.ID), transfer.from_branch_id, item.product_id]
        );

        const [destInventory] = await queryRunner.query(
          'SELECT * FROM branch_inventory WHERE userId = ? AND branch_id = ? AND product_id = ?',
          [String(user.ID), transfer.to_branch_id, item.product_id]
        );

        if (destInventory) {
          await queryRunner.query(
            'UPDATE branch_inventory SET quantity = quantity + ?, cost = ?, last_movement_date = NOW() WHERE userId = ? AND branch_id = ? AND product_id = ?',
            [item.quantity, item.cost, String(user.ID), transfer.to_branch_id, item.product_id]
          );
        } else {
          await queryRunner.query(
            'INSERT INTO branch_inventory (userId, branch_id, product_id, quantity, cost, min_stock, last_movement_date) VALUES (?, ?, ?, ?, ?, 0, NOW())',
            [String(user.ID), transfer.to_branch_id, item.product_id, item.quantity, item.cost]
          );
        }

        const [product] = await queryRunner.query('SELECT currentStock FROM products WHERE id = ?', [item.product_id]);
        
        await queryRunner.query(
          `INSERT INTO inventory_movements 
          (userId, product_id, branch_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes) 
          VALUES (?, ?, ?, 'transferencia_salida', ?, ?, ?, 'TRANSFER', ?, ?)`,
          [
            String(user.ID),
            item.product_id,
            transfer.from_branch_id,
            item.quantity,
            product?.currentStock || 0,
            (product?.currentStock || 0) - Number(item.quantity),
            transfer.transfer_number,
            `Transferencia a sucursal ${transfer.to_branch_id}`
          ]
        );

        await queryRunner.query(
          `INSERT INTO inventory_movements 
          (userId, product_id, branch_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes) 
          VALUES (?, ?, ?, 'transferencia_entrada', ?, ?, ?, 'TRANSFER', ?, ?)`,
          [
            String(user.ID),
            item.product_id,
            transfer.to_branch_id,
            item.quantity,
            product?.currentStock || 0,
            (product?.currentStock || 0),
            transfer.transfer_number,
            `Transferencia desde sucursal ${transfer.from_branch_id}`
          ]
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Transfer ${transfer.transfer_number} completed successfully`);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error completing transfer: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const transfer = await this.transferRepository.findOne({
      where: { id, userId: String(user.ID) }
    });

    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    if (transfer.status === 'completed') {
      throw new BadRequestException('No se puede eliminar una transferencia completada');
    }

    await this.transferRepository.remove(transfer);
  }
}
