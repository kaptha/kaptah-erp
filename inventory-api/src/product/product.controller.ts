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
  ParseIntPipe,
  Patch
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('products')
@UseGuards(FirebaseAuthGuard)
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.create(createProductDto, req.user.firebaseUid);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.findAllByUser(req.user.firebaseUid);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.findOne(id, req.user.firebaseUid);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.update(id, updateProductDto, req.user.firebaseUid);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.remove(id, req.user.firebaseUid);
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.updateStock(id, quantity, req.user.firebaseUid);
  }
}