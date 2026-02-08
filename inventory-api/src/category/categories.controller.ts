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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('categories')
// ❌ REMOVIDO: @UseGuards(FirebaseAuthGuard) - ahora se aplica por endpoint
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(
    private readonly categoriesService: CategoriesService
  ) {}

  @Get('firebase/:firebaseUid')
  @UseGuards(FirebaseAuthGuard) // ✅ Guard específico por endpoint
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    console.log('📋 GET /categories/firebase/:firebaseUid - firebaseUid:', firebaseUid);
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
  @UseGuards(FirebaseAuthGuard)
  async create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.create(createCategoryDto, req.user.firebaseUid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.update(id, updateCategoryDto, req.user.firebaseUid);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.categoriesService.remove(id, req.user.firebaseUid);
  }
}
