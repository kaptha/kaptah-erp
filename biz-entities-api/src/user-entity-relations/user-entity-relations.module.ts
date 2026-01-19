import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntityRelation } from './entities/user-entity-relation.entity';
import { UserEntityRelationsService } from './user-entity-relations.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntityRelation, User])],
  providers: [UserEntityRelationsService],
  exports: [UserEntityRelationsService],
})
export class UserEntityRelationsModule {}
