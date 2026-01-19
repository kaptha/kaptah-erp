import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { Tax } from './entities/tax.entity';
import { UserEntityRelationsModule } from '../user-entity-relations/user-entity-relations.module';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Tax]),
    UserEntityRelationsModule,
    UsersModule,
  ],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService], // Por si necesitas usar el servicio en otros módulos
})
export class TaxModule {}
