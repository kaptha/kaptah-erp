import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BranchTransfer } from './entities/branch-transfer.entity';
import { BranchTransferItem } from './entities/branch-transfer-item.entity';
import { CreateBranchTransferDto } from './dto/create-branch-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { FilterBranchTransferDto } from './dto/filter-branch-transfer.dto';
import { BranchInventoryService } from '../branch-inventory/branch-inventory.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BranchTransferService {
  private readonly logger = new Logger(BranchTransferService.name);

  constructor(
    @InjectRepository(BranchTransfer, 'inventory')
    private branchTransferRepository: Repository<BranchTransfer>,
    @InjectRepository(BranchTransferItem, 'inventory')
    private transferItemRepository: Repository<BranchTransferItem>,
    private branchInventoryService: BranchInventoryService,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async findAll(filterDto: FilterBranchTransferDto, firebaseUid: string) {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const queryBuilder = this.branchTransferRepository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.items', 'items')
      .where('bt.userId = :userId', { userId: String(user.ID) });

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
      const fromBranchQuery = 'SELECT s.id, s.alias FROM sucursales s WHERE s.id = ?';
      const toBranchQuery = 'SELECT s.id, s.alias FROM sucursales s WHERE s.id = ?';

      const [fromBranch] = await this.dataSource.query(fromBranchQuery, [transfer.from_branch_id]);
      const [toBranch] = await this.dataSource.query(toBranchQuery, [transfer.to_branch_id]);

      const itemsWithDetails = [];
      if (transfer.items && transfer.items.length > 0) {
        for (const item of transfer.items) {
          const productQuery = 'SELECT p.id, p.name, p.sku as code FROM products p WHERE p.id = ?';
          const inventoryManager = this.branchTransferRepository.manager;
          const products = await inventoryManager.query(productQuery, [item.product_id]);
          const product = products[0];

          itemsWithDetails.push({
            ...item,
            product_name: product?.name || 'N/A',
            product_code: product?.code || 'N/A'
          });
        }
      }

      result.push({
        ...transfer,
        items: itemsWithDetails,
        from_branch_alias: fromBranch?.alias || 'N/A',
        to_branch_alias: toBranch?.alias || 'N/A',
        total_items: itemsWithDetails.length,
        total_value: itemsWithDetails.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.cost)), 0)
      });
    }

    return result;
  }
}
