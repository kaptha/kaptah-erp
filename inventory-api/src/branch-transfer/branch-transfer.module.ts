import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchTransferService } from './branch-transfer.service';
import { BranchTransferController } from './branch-transfer.controller';
import { BranchTransfer } from './entities/branch-transfer.entity';
import { BranchTransferItem } from './entities/branch-transfer-item.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([BranchTransfer, BranchTransferItem], 'inventory'),
    UsersModule,
    AuthModule
  ],
  controllers: [BranchTransferController],
  providers: [BranchTransferService],
  exports: [BranchTransferService]
})
export class BranchTransferModule {}
