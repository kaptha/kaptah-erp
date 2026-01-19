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
import { ServiceCategoryService } from './service-category.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('service-categories')
@UseGuards(FirebaseAuthGuard)
export class ServiceCategoryController {
  private readonly logger = new Logger(ServiceCategoryController.name);

  constructor(
    private readonly serviceCategoryService: ServiceCategoryService
  ) {}

  @Post()
  async create(@Body() createServiceCategoryDto: CreateServiceCategoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceCategoryService.create(createServiceCategoryDto, req.user.firebaseUid);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceCategoryService.findAllByUser(req.user.firebaseUid);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceCategoryService.findOne(id, req.user.firebaseUid);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceCategoryDto: UpdateServiceCategoryDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceCategoryService.update(id, updateServiceCategoryDto, req.user.firebaseUid);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.serviceCategoryService.remove(id, req.user.firebaseUid);
  }
}
