import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';
import { Product } from '../product/entities/product.entity';
import { MovementType } from '../inventory-item/enums/movement-type.enum';
import { UsersService } from '../users/users.service';
import { EmailClientService } from '../email-client/email-client.service';
// 🆕 Imports para PDF
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import { format } from 'date-fns';
import * as puppeteer from 'puppeteer';
import axios from 'axios';
import * as admin from 'firebase-admin';

// 🆕 Interfaces para PDF
interface LogoResponse {
  filename: string;
  url: string;
  type: string;
  size: number;
}

interface SupplierResponse {
  ID: number;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  rfc?: string;
}

interface UserDataForTemplate {
  sucursal_nombre: string;
  empresa_rfc: string;
  empresa_email: string;
  empresa_telefono?: string;
}

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);
  // 🆕 URL del backend de biz-entities
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://localhost:3000';

  constructor(
    @InjectRepository(PurchaseOrder, 'inventory')
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem, 'inventory')
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Product, 'inventory')
    private readonly productRepository: Repository<Product>,
    @InjectDataSource('inventory')
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly emailClientService: EmailClientService,
  ) {}

  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    firebaseUid: string,
  ): Promise<PurchaseOrder> {
    // Obtener usuario desde firebaseUid
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generar número de orden
      const orderNumber = await this.generateOrderNumber();

      // Obtener información del proveedor (placeholder)
      const supplierName = `Proveedor-${createPurchaseOrderDto.supplierId}`;

      // Calcular totales
      let subtotal = 0;
      let totalTax = 0;

      const itemsData = [];

      for (const itemDto of createPurchaseOrderDto.items) {
        const product = await this.productRepository.findOne({
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Producto con ID ${itemDto.productId} no encontrado`,
          );
        }

        // Log para debug
        console.log('Product found:', {
          id: product.id,
          name: product.name,
          sku: product.sku
        });

        const itemSubtotal = itemDto.quantity * itemDto.unitCost;
        const taxRate = itemDto.taxRate || 0;
        const taxAmount = (itemSubtotal * taxRate) / 100;
        const itemTotal = itemSubtotal + taxAmount;

        subtotal += itemSubtotal;
        totalTax += taxAmount;

        itemsData.push({
          productId: product.id,
          product_name: product.name || 'Sin nombre',
          product_sku: product.sku || null,
          quantity: itemDto.quantity,
          unit_cost: itemDto.unitCost,
          tax_rate: taxRate,
          subtotal: itemSubtotal,
          taxAmount: taxAmount,
          total: itemTotal,
          notes: itemDto.notes || null,
        });
      }

      const total = subtotal + totalTax;

      // Crear orden de compra
      const purchaseOrder = this.purchaseOrderRepository.create({
        orderNumber,
        supplierId: createPurchaseOrderDto.supplierId,
        supplierName,
        userId: user.ID,
        status: createPurchaseOrderDto.status || PurchaseOrderStatus.DRAFT,
        orderDate: createPurchaseOrderDto.orderDate
          ? new Date(createPurchaseOrderDto.orderDate)
          : new Date(),
        expectedDate: createPurchaseOrderDto.expectedDate
          ? new Date(createPurchaseOrderDto.expectedDate)
          : null,
        subtotal,
        tax: totalTax,
        total,
        currency: createPurchaseOrderDto.currency || 'MXN',
        notes: createPurchaseOrderDto.notes,
        createdBy: user.ID,
      });

      const savedOrder = await queryRunner.manager.save(
        PurchaseOrder,
        purchaseOrder,
      );

      // Crear items directamente con queryRunner
      for (const itemData of itemsData) {
        console.log('Creating item with data:', itemData);
        
        const item = queryRunner.manager.create(PurchaseOrderItem, {
          ...itemData,
          purchaseOrderId: savedOrder.id,
        });
        
        console.log('Item created:', item);
        
        await queryRunner.manager.save(PurchaseOrderItem, item);
      }

      await queryRunner.commitTransaction();

      // Retornar orden completa con items
      return this.findOne(savedOrder.id, firebaseUid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(firebaseUid: string): Promise<PurchaseOrder[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.purchaseOrderRepository.find({
      where: { userId: user.ID },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, firebaseUid: string): Promise<PurchaseOrder> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id, userId: user.ID },
      relations: ['items', 'items.product'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
    }

    return purchaseOrder;
  }

  async update(
    id: number,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    firebaseUid: string,
  ): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, firebaseUid);

    // Solo se puede editar si está en DRAFT
    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar órdenes en estado DRAFT',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Si hay items nuevos, recalcular totales
      if (updatePurchaseOrderDto.items) {
        // Eliminar items existentes
        await queryRunner.manager.delete(PurchaseOrderItem, {
          purchaseOrderId: id,
        });

        // Recalcular totales
        let subtotal = 0;
        let totalTax = 0;

        const itemsData = [];

        for (const itemDto of updatePurchaseOrderDto.items) {
          const product = await this.productRepository.findOne({
            where: { id: itemDto.productId },
          });

          if (!product) {
            throw new NotFoundException(
              `Producto con ID ${itemDto.productId} no encontrado`,
            );
          }

          const itemSubtotal = itemDto.quantity * itemDto.unitCost;
          const taxRate = itemDto.taxRate || 0;
          const taxAmount = (itemSubtotal * taxRate) / 100;
          const itemTotal = itemSubtotal + taxAmount;

          subtotal += itemSubtotal;
          totalTax += taxAmount;

          itemsData.push({
            productId: product.id,
            product_name: product.name || 'Sin nombre',
            product_sku: product.sku || null,
            quantity: itemDto.quantity,
            unit_cost: itemDto.unitCost,
            tax_rate: taxRate,
            subtotal: itemSubtotal,
            taxAmount: taxAmount,
            total: itemTotal,
            notes: itemDto.notes || null,
          });
        }

        const total = subtotal + totalTax;

        // Actualizar orden
        await queryRunner.manager.update(
          PurchaseOrder,
          { id },
          {
            subtotal,
            tax: totalTax,
            total,
            ...updatePurchaseOrderDto,
          },
        );

        // Crear nuevos items directamente con queryRunner
        for (const itemData of itemsData) {
          const item = queryRunner.manager.create(PurchaseOrderItem, {
            ...itemData,
            purchaseOrderId: id,
          });
          await queryRunner.manager.save(PurchaseOrderItem, item);
        }
      } else {
        // Solo actualizar campos de la orden
        await queryRunner.manager.update(
          PurchaseOrder,
          { id },
          updatePurchaseOrderDto,
        );
      }

      await queryRunner.commitTransaction();

      return this.findOne(id, firebaseUid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number, firebaseUid: string): Promise<void> {
    const purchaseOrder = await this.findOne(id, firebaseUid);

    // Solo se puede eliminar si está en DRAFT
    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar órdenes en estado DRAFT',
      );
    }

    await this.purchaseOrderRepository.remove(purchaseOrder);
  }

  async changeStatus(
    id: number,
    newStatus: PurchaseOrderStatus,
    firebaseUid: string,
  ): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, firebaseUid);

    // Validar transiciones de estado válidas
    const validTransitions = {
      [PurchaseOrderStatus.DRAFT]: [
        PurchaseOrderStatus.SENT,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.SENT]: [
        PurchaseOrderStatus.PARTIAL,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.PARTIAL]: [
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.RECEIVED]: [],
      [PurchaseOrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[purchaseOrder.status].includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de ${purchaseOrder.status} a ${newStatus}`,
      );
    }

    purchaseOrder.status = newStatus;
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async receiveOrder(
    id: number,
    receivePurchaseOrderDto: ReceivePurchaseOrderDto,
    firebaseUid: string,
  ): Promise<PurchaseOrder> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const purchaseOrder = await this.findOne(id, firebaseUid);

    if (
      purchaseOrder.status !== PurchaseOrderStatus.SENT &&
      purchaseOrder.status !== PurchaseOrderStatus.PARTIAL
    ) {
      throw new BadRequestException(
        'Solo se pueden recibir órdenes en estado SENT o PARTIAL',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let allItemsFullyReceived = true;

      for (const receiveItem of receivePurchaseOrderDto.items) {
        const orderItem = await queryRunner.manager.findOne(PurchaseOrderItem, {
          where: { id: receiveItem.purchaseOrderItemId },
          relations: ['product'],
        });

        if (!orderItem) {
          throw new NotFoundException(
            `Item de orden ${receiveItem.purchaseOrderItemId} no encontrado`,
          );
        }

        if (orderItem.purchaseOrderId !== id) {
          throw new BadRequestException(
            `Item ${receiveItem.purchaseOrderItemId} no pertenece a esta orden`,
          );
        }

        const newQuantityReceived =
          Number(orderItem.quantityReceived) +
          Number(receiveItem.quantityReceived);

        if (newQuantityReceived > Number(orderItem.quantity)) {
          throw new BadRequestException(
            `La cantidad recibida (${newQuantityReceived}) excede la cantidad ordenada (${orderItem.quantity})`,
          );
        }

        // Actualizar cantidad recibida en el item
        orderItem.quantityReceived = newQuantityReceived;
        await queryRunner.manager.save(PurchaseOrderItem, orderItem);

        // Crear movimiento de inventario directamente
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: orderItem.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Producto con ID ${orderItem.productId} no encontrado`,
          );
        }

        const previousStock = product.currentStock;
        const newStock = previousStock + receiveItem.quantityReceived;
        const notes =
          receiveItem.notes || `Recepción OC #${purchaseOrder.orderNumber}`;

        // Insertar movimiento directamente con SQL
        await queryRunner.manager.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderItem.productId,
            MovementType.PURCHASE,
            receiveItem.quantityReceived,
            previousStock,
            newStock,
            'PURCHASE_ORDER',
            id.toString(),
            notes,
            user.ID,
          ],
        );

        // Actualizar stock del producto
        await queryRunner.manager.update(
          Product,
          { id: orderItem.productId },
          { currentStock: newStock },
        );

        // Verificar si este item está completamente recibido
        if (newQuantityReceived < Number(orderItem.quantity)) {
          allItemsFullyReceived = false;
        }
      }

      // Actualizar estado de la orden
      const newStatus = allItemsFullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIAL;

      const updateData: any = {
        status: newStatus,
        receivedBy: user.ID,
      };

      if (allItemsFullyReceived) {
        updateData.receivedDate = new Date();
      }

      if (receivePurchaseOrderDto.notes) {
        updateData.notes = purchaseOrder.notes
          ? `${purchaseOrder.notes}\n${receivePurchaseOrderDto.notes}`
          : receivePurchaseOrderDto.notes;
      }

      await queryRunner.manager.update(PurchaseOrder, { id }, updateData);

      await queryRunner.commitTransaction();

      return this.findOne(id, firebaseUid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Buscar la última orden del mes
    const lastOrder = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .where('po.orderNumber LIKE :pattern', {
        pattern: `OC-${year}${month}-%`,
      })
      .orderBy('po.orderNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `OC-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  async getOrdersByStatus(
    status: PurchaseOrderStatus,
    firebaseUid: string,
  ): Promise<PurchaseOrder[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.purchaseOrderRepository.find({
      where: { userId: user.ID, status },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrdersBySupplier(
    supplierId: number,
    firebaseUid: string,
  ): Promise<PurchaseOrder[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.purchaseOrderRepository.find({
      where: { userId: user.ID, supplierId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingOrders(firebaseUid: string): Promise<PurchaseOrder[]> {
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.purchaseOrderRepository.find({
      where: [
        { userId: user.ID, status: PurchaseOrderStatus.SENT },
        { userId: user.ID, status: PurchaseOrderStatus.PARTIAL },
      ],
      relations: ['items', 'items.product'],
      order: { expectedDate: 'ASC' },
    });
  }

  /**
   * Enviar orden de compra por email al proveedor
   */
  async sendPurchaseOrderByEmail(
    id: number,
    recipientEmail: string,
    customMessage: string,
    userId: string,
  ): Promise<{ jobId: string; logId: string; message: string }> {
    try {
      this.logger.log(`Enviando orden de compra ${id} a ${recipientEmail}`);

      // 1. Obtener la orden con sus items
      const order = await this.findOne(id, userId);

      if (!order) {
        throw new NotFoundException(`Orden de compra ${id} no encontrada`);
      }

      // 2. Mapear items para el email
      const emailItems = order.items.map(item => ({
        productName: item.product_name,
        productSku: item.product_sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_cost),
        taxRate: Number(item.tax_rate),
        subtotal: Number(item.subtotal),
        taxAmount: Number(item.taxAmount),
        total: Number(item.total),
      }));

      // 3. Preparar datos para el email
      const emailData = {
        userId,
        organizationId: userId,
        recipientEmail,
        purchaseOrderId: order.id,
        orderNumber: order.orderNumber,
        supplierName: order.supplierName,
        orderDate: new Date(order.orderDate).toISOString().split('T')[0],
        expectedDate: order.expectedDate 
          ? new Date(order.expectedDate).toISOString().split('T')[0]
          : 'Por definir',
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        currency: order.currency,
        items: emailItems,
        notes: order.notes,
        customMessage: customMessage || `Le enviamos nuestra orden de compra ${order.orderNumber}`,
      };

      // 4. Enviar email
      const result = await this.emailClientService.sendPurchaseOrder(emailData);

      this.logger.log(
        `Orden de compra enviada. JobId: ${result.jobId}, LogId: ${result.logId}`,
      );

      return {
        ...result,
        message: `Orden de compra enviada exitosamente a ${recipientEmail}`,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando orden de compra: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========================================================================
  // 🆕 NUEVOS MÉTODOS PARA GENERACIÓN DE PDF
  // ========================================================================

  /**
   * 🔐 Obtiene el logo del usuario como base64
   */
  private async obtenerLogoUsuario(userId: string, token: string): Promise<string | null> {
    try {
      console.log('🔍 Solicitando logo al biz-entities-api...');
      console.log('🔑 Token a enviar:', token?.substring(0, 50) + '...');
      
      const logoApiUrl = `${this.bizEntitiesApiUrl}/api/logos/current`;
      console.log('🌐 URL destino:', logoApiUrl);
      
      const response = await axios.get<LogoResponse>(logoApiUrl, {
        headers: {
          'Authorization': token
        }
      });
      
      if (response.data?.url) {
        console.log('✅ Logo URL obtenida:', response.data.url);
        
        try {
          const logoResponse = await axios.get<ArrayBuffer>(response.data.url, {
            responseType: 'arraybuffer'
          });
          
          const base64Logo = Buffer.from(logoResponse.data).toString('base64');
          const mimeType = logoResponse.headers['content-type'] || 'image/png';
          const logoDataUri = `data:${mimeType};base64,${base64Logo}`;
          
          console.log('✅ Logo convertido a base64');
          return logoDataUri;
        } catch (downloadError: any) {
          console.error('❌ Error descargando logo para base64:', downloadError.message);
          return response.data.url;
        }
      }
      
      console.log('⚠️ No se encontró URL de logo en la respuesta');
      return null;
    } catch (error: any) {
      console.error('❌ Error obteniendo logo:', error.message);
      return null;
    }
  }

  /**
   * 📞 Obtiene datos del proveedor desde biz-entities-api
   */
  private async obtenerDatosProveedor(
    supplierId: number,
    token: string
  ): Promise<SupplierResponse | null> {
    try {
      console.log('🏭 Buscando proveedor en biz-entities-api...');
      console.log('📋 Supplier ID:', supplierId);
      
      const supplierApiUrl = `${this.bizEntitiesApiUrl}/api/suppliers/${supplierId}`;
      console.log('🌐 URL destino:', supplierApiUrl);
      
      const response = await axios.get<SupplierResponse>(supplierApiUrl, {
        headers: {
          'Authorization': token
        },
      });
      
      if (response.data) {
        console.log('✅ Proveedor encontrado:', {
          ID: response.data.ID,
          nombre: response.data.nombre,
          telefono: response.data.telefono,
          email: response.data.email,
        });
        return response.data;
      }
      
      console.log('⚠️ Proveedor NO encontrado con ID:', supplierId);
      return null;
    } catch (error: any) {
      console.error('❌ Error obteniendo datos del proveedor:', error.message);
      return null;
    }
  }

  /**
   * 👤 Obtiene datos del usuario para el template
   */
  private async obtenerDatosUsuario(userId: string, token: string): Promise<UserDataForTemplate | null> {
    try {
      console.log('👤 Obteniendo datos del usuario...');
      
      // Aquí deberías hacer una llamada a tu servicio de usuarios
      // Por ahora retornamos datos mockeados
      return {
        sucursal_nombre: 'Mi Empresa',
        empresa_rfc: 'XAXX010101000',
        empresa_email: 'contacto@miempresa.com',
        empresa_telefono: '(555) 123-4567'
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo datos del usuario:', error.message);
      return null;
    }
  }

  /**
   * 📄 MÉTODO PRINCIPAL: Genera PDF de orden de compra con estilo personalizado
   */
  async generarPdfOrdenCompra(
    id: number,
    userId: string,
    estilo: string,
    token: string | null
  ): Promise<Buffer> {
    console.log('📄 Iniciando generación de PDF de orden de compra');
    console.log('📋 Purchase Order ID:', id);
    console.log('👤 User ID recibido:', userId);
    console.log('🎨 Estilo:', estilo);
    console.log('🔑 Token disponible:', token ? 'Sí' : 'No');

    // Extraer userId del token si no se proporciona
    let finalUserId = userId;
    let datosUsuario = null;
    
    if (!finalUserId && token) {
      try {
        console.log('🔍 Extrayendo userId del token de Firebase...');
        const cleanToken = token.replace('Bearer ', '');
        const decodedToken = await admin.auth().verifyIdToken(cleanToken);
        finalUserId = decodedToken.uid;
        console.log('✅ User ID extraído del token:', finalUserId);
      } catch (error: any) {
        console.error('❌ Error al decodificar token:', error.message);
        throw new Error('Token inválido');
      }
    }
    
    if (!finalUserId) {
      throw new Error('No se pudo obtener el userId');
    }
    
    console.log('👤 User ID final a usar:', finalUserId);

    // Obtener datos del usuario
    if (finalUserId && token) {
      try {
        console.log('👤 Obteniendo datos del usuario...');
        datosUsuario = await this.obtenerDatosUsuario(finalUserId, token);
        console.log('✅ Datos del usuario obtenidos:', datosUsuario);
      } catch (error: any) {
        console.error('⚠️ Error al obtener datos del usuario:', error.message);
      }
    }

    try {
      // Obtener la orden de compra con sus items
      const purchaseOrder = await this.findOne(id, finalUserId);
      console.log('✅ Orden de compra encontrada:', purchaseOrder.id);

      // Validar que el template existe
      const templatesPath = path.join(process.cwd(), 'src', 'templates');
      const htmlPath = path.join(templatesPath, `orden-compra-${estilo}.html`);

      console.log('📄 HTML path:', htmlPath);
      console.log('📄 HTML exists?', fs.existsSync(htmlPath));

      if (!fs.existsSync(htmlPath)) {
        throw new NotFoundException(`Template HTML no encontrado en: ${htmlPath}`);
      }

      console.log('✅ Template HTML existe');

      const templateHtml = fs.readFileSync(htmlPath, 'utf8');

      // Obtener logo del usuario
      let logoDataUri: string;

      if (token) {
        const logoUrl = await this.obtenerLogoUsuario(finalUserId, token);
        
        if (logoUrl) {
          logoDataUri = logoUrl;
          console.log('✅ Usando logo del usuario');
        } else {
          const logoPath = path.join(templatesPath, 'logo.png');
          if (fs.existsSync(logoPath)) {
            const logoBase64 = fs.readFileSync(logoPath).toString('base64');
            logoDataUri = `data:image/png;base64,${logoBase64}`;
            console.log('⚠️ Usando logo por defecto (fallback)');
          } else {
            logoDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            console.log('⚠️ Logo por defecto no existe, usando placeholder');
          }
        }
      } else {
        const logoPath = path.join(templatesPath, 'logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBase64 = fs.readFileSync(logoPath).toString('base64');
          logoDataUri = `data:image/png;base64,${logoBase64}`;
          console.log('⚠️ Sin token, usando logo por defecto');
        } else {
          logoDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          console.log('⚠️ Sin token y sin logo por defecto, usando placeholder');
        }
      }

      console.log('✅ Logo preparado');

      // Obtener datos del proveedor desde biz-entities-api
      let proveedorTelefono = 'N/A';
      let proveedorDireccion = 'Dirección del proveedor';
      let proveedorCiudad = 'N/A';
      let proveedorEmail = 'N/A';
      let proveedorRfc = 'N/A';

      if (purchaseOrder.supplierId && token) {
        const proveedor = await this.obtenerDatosProveedor(purchaseOrder.supplierId, token);
        
        if (proveedor) {
          proveedorTelefono = proveedor.telefono || 'N/A';
          proveedorDireccion = proveedor.direccion || 'Dirección del proveedor';
          proveedorCiudad = proveedor.ciudad || 'N/A';
          proveedorEmail = proveedor.email || 'N/A';
          proveedorRfc = proveedor.rfc || 'N/A';
          
          console.log('✅ Datos del proveedor aplicados:', {
            telefono: proveedorTelefono,
            direccion: proveedorDireccion,
            ciudad: proveedorCiudad,
            email: proveedorEmail,
          });
        }
      }

      // Generar HTML de items
      const itemsHtml = purchaseOrder.items.map(item => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_cost);
        const subtotal = Number(item.subtotal);
        
        return `
          <tr>
            <td>${item.product_name || 'Producto'}</td>
            <td>${item.notes || ''}</td>
            <td>${quantity}</td>
            <td>$${unitPrice.toFixed(2)}</td>
            <td>$${subtotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      // Calcular totales
      const subtotal = Number(purchaseOrder.subtotal);
      const impuestos = Number(purchaseOrder.tax);
      const total = Number(purchaseOrder.total);

      // Preparar datos de la empresa
      const empresaNombre = datosUsuario?.sucursal_nombre || 'Mi Empresa';
      const empresaRfc = datosUsuario?.empresa_rfc || 'XAXX010101000';
      const empresaTelefono = datosUsuario?.empresa_telefono || '(555) 123-4567';
      const empresaEmail = datosUsuario?.empresa_email || 'contacto@empresa.com';

      console.log('🏢 Datos de la empresa para el PDF:', {
        nombre: empresaNombre,
        rfc: empresaRfc,
        telefono: empresaTelefono,
        email: empresaEmail,
      });

      // Extraer día, mes y año de la fecha de orden
      const fechaOrden = new Date(purchaseOrder.orderDate);
      const dia = fechaOrden.getDate().toString().padStart(2, '0');
      const mes = (fechaOrden.getMonth() + 1).toString().padStart(2, '0');
      const anio = fechaOrden.getFullYear().toString();

      // Fecha esperada de entrega
      const fechaEsperada = purchaseOrder.expectedDate 
        ? format(new Date(purchaseOrder.expectedDate), 'dd/MM/yyyy')
        : 'Por definir';

      // Reemplazar variables en el template
      let htmlFinal = templateHtml
        .replace('{{logo}}', logoDataUri)
        .replace(/\{\{tipo_documento\}\}/g, 'ORDEN DE COMPRA')
        .replace('{{fecha}}', format(fechaOrden, 'dd/MM/yyyy'))
        .replace(/\{\{dia\}\}/g, dia)
        .replace(/\{\{mes\}\}/g, mes)
        .replace(/\{\{anio\}\}/g, anio)
        .replace(/\{\{numero_orden\}\}/g, purchaseOrder.orderNumber)
        .replace(/\{\{folio\}\}/g, purchaseOrder.orderNumber)
        .replace(/\{\{fecha_esperada\}\}/g, fechaEsperada)
        .replace(/\{\{proveedor\}\}/g, purchaseOrder.supplierName || 'Proveedor')
        .replace(/\{\{proveedor_nombre\}\}/g, purchaseOrder.supplierName || 'Proveedor')
        .replace(/\{\{proveedor_direccion\}\}/g, proveedorDireccion)
        .replace(/\{\{proveedor_rfc\}\}/g, proveedorRfc)
        .replace(/\{\{proveedor_telefono\}\}/g, proveedorTelefono)
        .replace(/\{\{proveedor_ciudad\}\}/g, proveedorCiudad)
        .replace(/\{\{proveedor_email\}\}/g, proveedorEmail)
        .replace('{{items}}', itemsHtml)
        .replace('{{subtotal}}', subtotal.toFixed(2))
        .replace('{{impuestos}}', impuestos.toFixed(2))
        .replace('{{total}}', total.toFixed(2))
        .replace(/\{\{moneda\}\}/g, purchaseOrder.currency || 'MXN')
        .replace(/\{\{notas\}\}/g, purchaseOrder.notes || 'Sin notas adicionales')
        .replace(/\{\{estado\}\}/g, this.getStatusText(purchaseOrder.status))
        // Datos de la empresa emisora
        .replace(/\{\{empresa_nombre\}\}/g, empresaNombre)
        .replace(/\{\{empresa_rfc\}\}/g, empresaRfc)
        .replace(/\{\{empresa_telefono\}\}/g, empresaTelefono)
        .replace(/\{\{empresa_email\}\}/g, empresaEmail);

      console.log('✅ HTML generado, iniciando Puppeteer...');

      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();

      await page.setContent(htmlFinal, {
        waitUntil: 'networkidle0',
      });

      console.log('✅ Contenido cargado en Puppeteer');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8px', bottom: '8px', left: '8px', right: '8px' },
      });

      await browser.close();

      console.log('✅ PDF generado exitosamente, tamaño:', pdfBuffer.length);

      return Buffer.from(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  }

  /**
   * 🏷️ Helper para obtener texto del estado
   */
  private getStatusText(status: PurchaseOrderStatus): string {
    const statusTexts: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'Borrador',
      [PurchaseOrderStatus.SENT]: 'Enviada',
      [PurchaseOrderStatus.PARTIAL]: 'Parcial',
      [PurchaseOrderStatus.RECEIVED]: 'Recibida',
      [PurchaseOrderStatus.CANCELLED]: 'Cancelada',
    };
    return statusTexts[status] || status;
  }
}