import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  ConflictException,
  ValidationPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('suppliers')
@UseGuards(FirebaseAuthGuard)
export class SuppliersController {
  private readonly logger = new Logger(SuppliersController.name);

  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(@Body() createSupplierDto: CreateSupplierDto, @Req() req: RequestWithUser) {
    console.log('Datos recibidos en el backend:', createSupplierDto);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    return this.suppliersService.create(createSupplierDto, req.user.firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.suppliersService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto
  ) {
    try {
      return await this.suppliersService.update(id, updateSupplierDto);
    } catch (error) {
      this.logger.error(`Error al actualizar proveedor: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar el proveedor');
    }
  }

  @Delete(':ID')
  async remove(@Param('ID', ParseIntPipe) ID: number) {
    console.log(`Recibida solicitud para eliminar proveedor con ID: ${ID}`);
    try {
      return await this.suppliersService.remove(ID);
    } catch (error) {
      this.logger.error(`Error al eliminar proveedor: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar el proveedor');
    }
  }
}
