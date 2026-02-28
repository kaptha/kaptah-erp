import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchInventoryService } from './branch-inventory.service';
import { BranchInventoryController } from './branch-inventory.controller';
import { BranchInventory } from './entities/branch-inventory.entity';
import { UsersModule } from '../users/users.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchInventory], 'inventory'),
    UsersModule 
  ],
  controllers: [BranchInventoryController],
  providers: [BranchInventoryService],
  exports: [BranchInventoryService]
})
export class BranchInventoryModule {}
