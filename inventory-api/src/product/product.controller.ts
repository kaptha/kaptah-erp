import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Logger,
  ParseIntPipe,
  Query,
  Patch
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Request } from 'express';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('productos.crear')
  async create(@Body() createProductDto: CreateProductDto, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.productService.create(createProductDto, ownerUid);
  }

  @Patch('internal/deduct-stock')
  @UseGuards(InternalApiKeyGuard)
  async internalDeductStock(
    @Body() body: {
      productId: number;
      quantity: number;
      firebaseUid: string;
    }
  ) {
    return this.productService.updateStock(body.productId, -body.quantity, body.firebaseUid);
  }
@Post('internal/costs-by-ids')
  @UseGuards(InternalApiKeyGuard)
  async getCostsByIds(@Body() body: { ids: number[] }) {
    return this.productService.getCostsByIds(body.ids);
  }

  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    console.log('GET /products/firebase/:firebaseUid - firebaseUid:', firebaseUid);
    return this.productService.findAllByUser(firebaseUid);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.findOne(id, req.user.firebaseUid);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.productService.findAllByUser(req.user.firebaseUid);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('productos.editar')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.productService.update(id, updateProductDto, ownerUid);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('productos.eliminar')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.productService.remove(id, ownerUid);
  }

  @Patch(':id/stock')
  @UseGuards(FirebaseAuthGuard)
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
// deploy trigger
