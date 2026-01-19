import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Logger,
  Query,
  UnauthorizedException
 } from '@nestjs/common';
 import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
 import { InventoryItemService } from './inventory-item.service';
 import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
 
 interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
 }
 
 @Controller('inventory-movements')
 @UseGuards(FirebaseAuthGuard)
 export class InventoryItemController {
  private readonly logger = new Logger(InventoryItemController.name);
 
  constructor(
    private readonly inventoryItemService: InventoryItemService
  ) {}
 
  @Post()
  async create(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inventoryItemService.create(createInventoryItemDto, req.user.firebaseUid);
  }
 
  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('productId') productId?: number
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
 
    if (productId) {
      return this.inventoryItemService.findByProduct(productId, req.user.firebaseUid);
    }
 
    return this.inventoryItemService.findAll(req.user.firebaseUid);
  }
 
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inventoryItemService.findOne(id, req.user.firebaseUid);
  }
 }
