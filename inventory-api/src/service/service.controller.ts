import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Logger,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Request } from 'express';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('services')
export class ServiceController {
  private readonly logger = new Logger(ServiceController.name);

  constructor(
    private readonly serviceService: ServiceService
  ) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('servicios.crear')
  async create(@Body() createServiceDto: CreateServiceDto, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.serviceService.create(createServiceDto, ownerUid);
  }
  @Get('firebase/:firebaseUid')
async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
  console.log('📋 GET /services/firebase/:firebaseUid - firebaseUid:', firebaseUid);
  return this.serviceService.findAllByUser(firebaseUid);
}
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.findOne(id, req.user.firebaseUid);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.findAllByUser(req.user.firebaseUid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('servicios.editar')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: any,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.serviceService.update(id, updateServiceDto, ownerUid);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('servicios.eliminar')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.serviceService.remove(id, ownerUid);
  }
}
