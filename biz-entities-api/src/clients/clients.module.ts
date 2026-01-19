import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { UserEntityRelationsModule } from '../user-entity-relations/user-entity-relations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    UserEntityRelationsModule,
    UsersModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
