import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { UsersModule } from '../users/users.module';
import { UserEntityRelationsModule } from '../user-entity-relations/user-entity-relations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    UsersModule,
    UserEntityRelationsModule
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
