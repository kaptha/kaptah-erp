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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Request } from 'express';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(
    private readonly categoriesService: CategoriesService
  ) {}

  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('📋 GET /categories/firebase/:firebaseUid - firebaseUid: ' + firebaseUid);
    return this.categoriesService.findAllByUser(firebaseUid);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.findOne(id, req.user.firebaseUid);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.findAllByUser(req.user.firebaseUid);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('categorias.crear')
  async create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.categoriesService.create(createCategoryDto, ownerUid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('categorias.editar')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.update(id, updateCategoryDto, cuentaUid || req.user.firebaseUid);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('categorias.eliminar')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.remove(id, cuentaUid || req.user.firebaseUid);
  }
}
