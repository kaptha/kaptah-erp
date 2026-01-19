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
  ParseIntPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('services')
@UseGuards(FirebaseAuthGuard)
export class ServiceController {
  private readonly logger = new Logger(ServiceController.name);

  constructor(
    private readonly serviceService: ServiceService
  ) {}

  @Post()
  async create(@Body() createServiceDto: CreateServiceDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.create(createServiceDto, req.user.firebaseUid);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.findAllByUser(req.user.firebaseUid);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.findOne(id, req.user.firebaseUid);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.update(id, updateServiceDto, req.user.firebaseUid);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceService.remove(id, req.user.firebaseUid);
  }
}