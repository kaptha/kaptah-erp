import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { Branch } from './entities/branch.entity';
import { UserEntityRelationsModule } from '../user-entity-relations/user-entity-relations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch]),
    UserEntityRelationsModule,
    UsersModule,
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService], // Por si necesitas usar el servicio en otros módulos
})
export class BranchModule {}
