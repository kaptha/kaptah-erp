import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Query,
  UnauthorizedException,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { SendPurchaseOrderEmailDto } from '../email-client/dto/send-purchase-order-email.dto';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}
@Get('firebase/:firebaseUid/:id/pdf/:style')
@ApiOperation({ summary: 'Generar PDF de orden de compra (via Firebase UID)' })
async generarPdfDeOrdenFirebase(
  @Param('id', ParseIntPipe) id: number,
  @Param('firebaseUid') firebaseUid: string,
  @Param('style') estilo: string,
  @Req() req: RequestWithUser,
  @Res() res: Response,
) {
  console.log('📄 Request para generar PDF de orden de compra (Firebase)');
  console.log('📋 Purchase Order ID:', id);
  console.log('🎨 Estilo:', estilo);
  console.log('🔑 Firebase UID:', firebaseUid);

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader : null;

  const pdf = await this.purchaseOrderService.generarPdfOrdenCompra(
    id,
    firebaseUid,
    estilo,
    token,
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=orden_compra_${id}.pdf`,
    'Content-Length': pdf.length.toString(),
  });

  res.end(pdf);
}

  // 🆕 NUEVO ENDPOINT: Generar PDF de orden de compra
  @Get(':id/pdf/:style')
  @ApiOperation({ summary: 'Generar PDF de orden de compra con estilo personalizado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden de compra' })
  @ApiParam({ 
    name: 'style', 
    type: String, 
    description: 'Estilo del PDF (minimal, classic, modern)',
    enum: ['minimal', 'classic', 'modern']
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async generarPdfDeOrden(
    @Param('id', ParseIntPipe) id: number,
    @Param('style') estilo: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    console.log('📄 Request para generar PDF de orden de compra');
    console.log('📋 Purchase Order ID:', id);
    console.log('🎨 Estilo:', estilo);
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    
    console.log('🔑 Token recibido:', token ? 'Sí' : 'No');
    
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const pdf = await this.purchaseOrderService.generarPdfOrdenCompra(
      id,
      req.user.firebaseUid,
      estilo,
      token
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orden_compra_${id}.pdf`,
      'Content-Length': pdf.length.toString(),
    });

    res.end(pdf);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva orden de compra' })
  @ApiResponse({
    status: 201,
    description: 'Orden de compra creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.create(
      createPurchaseOrderDto,
      req.user.firebaseUid,
    );
  }
 @Get('firebase/:firebaseUid')
async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
  console.log('📋 GET /purchase-orders/firebase/:firebaseUid - firebaseUid:', firebaseUid);
  return this.purchaseOrderService.findAllByUser(firebaseUid);
}

  @Get()
  @ApiOperation({ summary: 'Listar todas las órdenes de compra' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes de compra' })
  async findAll(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.findAll(req.user.firebaseUid);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Obtener órdenes pendientes de recibir' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes pendientes' })
  async getPendingOrders(@Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.getPendingOrders(req.user.firebaseUid);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Obtener órdenes por estado' })
  @ApiParam({ name: 'status', enum: PurchaseOrderStatus })
  @ApiResponse({ status: 200, description: 'Lista de órdenes filtradas' })
  async getOrdersByStatus(
    @Param('status') status: PurchaseOrderStatus,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.getOrdersByStatus(
      status,
      req.user.firebaseUid,
    );
  }

  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'Obtener órdenes por proveedor' })
  @ApiParam({ name: 'supplierId', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del proveedor' })
  async getOrdersBySupplier(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.getOrdersBySupplier(
      supplierId,
      req.user.firebaseUid,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden de compra por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Orden de compra encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.findOne(id, req.user.firebaseUid);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar orden de compra (solo en estado DRAFT)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Orden de compra actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden editar órdenes en estado DRAFT',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.update(
      id,
      updatePurchaseOrderDto,
      req.user.firebaseUid,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar orden de compra (solo en estado DRAFT)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Orden eliminada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden eliminar órdenes en estado DRAFT',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.remove(id, req.user.firebaseUid);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la orden de compra' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'status', enum: PurchaseOrderStatus })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Transición de estado no válida' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status: PurchaseOrderStatus,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.changeStatus(
      id,
      status,
      req.user.firebaseUid,
    );
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Recibir mercancía de la orden de compra' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Mercancía recibida, inventario actualizado',
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden recibir órdenes en estado SENT o PARTIAL',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async receiveOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() receivePurchaseOrderDto: ReceivePurchaseOrderDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.receiveOrder(
      id,
      receivePurchaseOrderDto,
      req.user.firebaseUid,
    );
  }
@Post('firebase/:firebaseUid/:id/send-email')
@ApiOperation({ summary: 'Enviar orden de compra por email (via Firebase UID)' })
async sendByEmailFirebase(
  @Param('id', ParseIntPipe) id: number,
  @Param('firebaseUid') firebaseUid: string,
  @Body() emailData: SendPurchaseOrderEmailDto,
) {
  return this.purchaseOrderService.sendPurchaseOrderByEmail(
    id,
    emailData.recipientEmail,
    emailData.customMessage,
    firebaseUid,
  );
}

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Enviar orden de compra por email al proveedor' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Email enviado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async sendByEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() emailData: SendPurchaseOrderEmailDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.purchaseOrderService.sendPurchaseOrderByEmail(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      req.user.firebaseUid,
    );
  }
}
