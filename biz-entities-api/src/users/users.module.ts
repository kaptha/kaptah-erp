import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserPostgres } from './entities/user.postgres.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Para MySQL (conexión default)
    TypeOrmModule.forFeature([UserPostgres], 'postgres') // Para PostgreSQL
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
