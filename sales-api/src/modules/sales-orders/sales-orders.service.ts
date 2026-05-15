import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from './entities/sales-order.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { TaxCalculator } from '../../shared/helpers/calculate-tax.helper';
import { SucursalesService } from '../sucursales/sucursales.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { EmailClientService } from '../email-client/email-client.service';
import { Buffer } from 'buffer';
import { format } from 'date-fns';
import * as puppeteer from 'puppeteer';
import { QueueClientService } from '../queue-client/queue-client.service';

interface LogoResponse {
  filename: string;
  url: string;
  type: string;
  size: number;
}

// 👇 NUEVO: Interfaz para respuesta de cliente
interface ClientResponse {
  ID: number;
  Nombre: string;
  Email: string;
  Telefono?: string;
  direccion?: string;
  ciudad?: string;
  Rfc?: string;
  RegFiscal?: string;
  Copostal?: number;
  Colonia?: string;
}

@Injectable()
export class SalesOrdersService {
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://localhost:3000';
  private readonly logger = new Logger(SalesOrdersService.name);
  constructor(
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    private sucursalesService: SucursalesService,
    private usuariosService: UsuariosService,
    private emailClientService: EmailClientService,
    private readonly queueClient: QueueClientService,
  ) {}

  /**
   * 🔍 Buscar orden por folio
   */
  async findByFolio(folio: string, userId: string): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({
      where: { folio, userId },
    });

    if (!order) {
      throw new NotFoundException(`Orden con folio ${folio} no encontrada`);
    }

    return order;
  }

  /**
   * 📊 Obtener estadísticas de folios por año
   */
  async getFolioStats(year?: number): Promise<{ year: number; count: number; lastFolio: string }> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `OV-${currentYear}-`;

    const count = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .where('salesOrder.folio LIKE :pattern', { pattern: `${prefix}%` })
      .getCount();

    const lastOrder = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .where('salesOrder.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('salesOrder.folio', 'DESC')
      .getOne();

    return {
      year: currentYear,
      count,
      lastFolio: lastOrder?.folio || `${prefix}0000`,
    };
  }
  /**
   * Obtiene el logo del usuario desde biz-entities-api
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
        },
      });
      
      if (response.data?.url) {
        console.log('✅ Logo obtenido:', response.data.url);
        return response.data.url;
      }
      
      console.log('⚠️ No se encontró URL de logo en la respuesta');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo logo:', error.message);
      console.error('❌ Código de error:', error.code);
      return null;
    }
  }

  /**
 * Obtiene datos del cliente desde biz-entities-api por RFC o nombre
 */
private async obtenerDatosCliente(
  rfc: string, 
  nombre: string,
  token: string
): Promise<ClientResponse | null> {
  try {
    console.log('👤 Buscando cliente por RFC en biz-entities-api...');
    console.log('📋 RFC:', rfc);
    
    // 👇 Usar el nuevo endpoint específico para buscar por RFC
    const clientApiUrl = `${this.bizEntitiesApiUrl}/api/clients/by-rfc/${encodeURIComponent(rfc)}`;
    console.log('🌐 URL destino:', clientApiUrl);
    
    const response = await axios.get<ClientResponse>(clientApiUrl, {
      headers: {
        'Authorization': token
      },
    });
    
    if (response.data) {
      console.log('✅ Cliente encontrado:', {
        ID: response.data.ID,
        nombre: response.data.Nombre,
        rfc: response.data.Rfc,
        telefono: response.data.Telefono,
        direccion: response.data.direccion,
        ciudad: response.data.ciudad,
      });
      return response.data;
    }
    
    console.log('⚠️ Cliente NO encontrado con RFC:', rfc);
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo datos del cliente:', error.message);
    if (error.response?.status === 404) {
      console.log('⚠️ Cliente no existe en la base de datos');
    }
    return null;
  }
}

  async findOne(id: string, userId: string): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({
      where: { id, userId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async generarPdfEstiloRemision(
    id: string, 
    userId: string, 
    estilo: string,
    token: string | null
  ): Promise<Buffer> {
    console.log('📄 Iniciando generación de PDF');
    console.log('📋 Order ID:', id);
    console.log('👤 User ID:', userId);
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
      } catch (error) {
        console.error('❌ Error al decodificar token:', error.message);
        throw new Error('Token inválido');
      }
    }
    
    if (!finalUserId) {
      throw new Error('No se pudo obtener el userId');
    }
    
    console.log('👤 User ID final a usar:', finalUserId);

    // Obtener datos del usuario desde MySQL
    if (finalUserId) {
      try {
        console.log('👤 Obteniendo datos del usuario desde MySQL...');
        datosUsuario = await this.usuariosService.getDatosParaTemplate(finalUserId);
        console.log('✅ Datos del usuario obtenidos:', {
          nombre: datosUsuario.sucursal_nombre,
          rfc: datosUsuario.empresa_rfc,
          email: datosUsuario.empresa_email,
        });
      } catch (error) {
        console.error('⚠️ Error al obtener datos del usuario:', error.message);
      }
    }

    try {
      const order = await this.findOne(id, finalUserId);
      console.log('✅ Orden encontrada:', order.id);
      console.log('📋 RFC del cliente en la orden:', order.customerRfc); 
      console.log('👤 Nombre del cliente en la orden:', order.customerName);
      const templatesPath = path.join(process.cwd(), 'src', 'templates');
      const htmlPath = path.join(templatesPath, `remision-${estilo}.html`);

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
          console.log('✅ Usando logo del usuario:', logoUrl);
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

      console.log('✅ Archivos leídos correctamente');

      // 👇 NUEVO: Obtener datos del cliente desde biz-entities-api
      let clienteTelefono = 'N/A';
      let clienteCiudad = 'N/A';
      let clienteDireccion = order.customerAddress || 'N/A';

      if (order.customerRfc && token) {
  const cliente = await this.obtenerDatosCliente(
    order.customerRfc, 
    order.customerName, // 👈 Pasar también el nombre
    token
  );
  
  if (cliente) {
    clienteTelefono = cliente.Telefono || 'N/A';
    clienteCiudad = cliente.ciudad || cliente.Colonia || 'N/A';
    clienteDireccion = cliente.direccion || order.customerAddress || 'N/A';
    
    console.log('✅ Datos del cliente aplicados:', {
      telefono: clienteTelefono,
      ciudad: clienteCiudad,
      direccion: clienteDireccion,
    });
  }
}

      // Obtener datos de la sucursal desde MySQL
      let sucursal = null;
      if (order.sucursalId) {
        try {
          console.log('🏢 Obteniendo sucursal con ID:', order.sucursalId);
          sucursal = await this.sucursalesService.findById(order.sucursalId);
          console.log('✅ Sucursal encontrada:', sucursal?.alias || 'Sin alias');
        } catch (error) {
          console.error('⚠️ Error al obtener sucursal:', error.message);
        }
      } else {
        console.log('⚠️ La orden no tiene sucursalId asignado');
      }

      const itemsHtml = order.items.map(item => `
        <tr>
          <td>${item.quantity}</td>
          <td>${item.description}</td>
          <td>$${item.unitPrice.toFixed(2)}</td>
          <td>$${item.total.toFixed(2)}</td>
        </tr>
      `).join('');

      // Preparar datos de la empresa con prioridad correcta
      const empresaNombre = datosUsuario?.sucursal_nombre || sucursal?.alias || 'Mi Empresa';
      const empresaRfc = datosUsuario?.empresa_rfc || 'XAXX010101000';
      const empresaTelefono = datosUsuario?.empresa_telefono || sucursal?.telefono || 'Sin teléfono';
      const empresaEmail = datosUsuario?.empresa_email || 'contacto@empresa.com';

      console.log('🏢 Datos de la empresa para el PDF:', {
        nombre: empresaNombre,
        rfc: empresaRfc,
        telefono: empresaTelefono,
        email: empresaEmail,
      });

      // Extraer día, mes y año de la fecha
      const fecha = new Date(order.createdAt);
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear().toString();

      let htmlFinal = templateHtml
        .replace('{{logo}}', logoDataUri)
        .replace(/\{\{tipo_documento\}\}/g, 'ORDEN DE VENTA')
        .replace('{{fecha}}', format(fecha, 'dd/MM/yyyy'))
        .replace(/\{\{dia\}\}/g, dia)
        .replace(/\{\{mes\}\}/g, mes)
        .replace(/\{\{anio\}\}/g, anio)
        .replace('{{folio}}', order.folio)
        .replace(/\{\{cliente\}\}/g, order.customerName)
        .replace(/\{\{direccion\}\}/g, clienteDireccion)  // 👈 Dato del cliente
        .replace(/\{\{rfc\}\}/g, order.customerRfc || 'N/A')
        .replace(/\{\{telefono\}\}/g, clienteTelefono)    // 👈 Dato del cliente
        .replace(/\{\{ciudad\}\}/g, clienteCiudad)        // 👈 Dato del cliente
        .replace('{{items}}', itemsHtml)
        .replace('{{subtotal}}', Number(order.subtotal).toFixed(2))
        .replace('{{impuestos}}', Number(order.tax).toFixed(2))
        .replace('{{total}}', Number(order.total).toFixed(2))
        // Reemplazar datos de la empresa emisora
        .replace(/\{\{sucursal_nombre\}\}/g, empresaNombre)
        .replace(/\{\{empresa_nombre\}\}/g, empresaNombre)
        .replace(/\{\{empresa_rfc\}\}/g, empresaRfc);

      // Reemplazar variables de la sucursal (dirección física)
      if (sucursal) {
        console.log('📝 Reemplazando variables de sucursal...');
        
        htmlFinal = htmlFinal
          .replace(/\{\{sucursal_direccion\}\}/g, sucursal.direccion || 'Sin dirección')
          .replace(/\{\{sucursal_calle\}\}/g, sucursal.direccion || 'Sin dirección')
          .replace(/\{\{sucursal_ciudad\}\}/g, sucursal.colonia || 'Sin colonia')
          .replace(/\{\{sucursal_estado\}\}/g, '')
          .replace(/\{\{sucursal_codigoPostal\}\}/g, sucursal.codigoPostal || 'Sin C.P.')
          .replace(/\{\{sucursal_telefono\}\}/g, empresaTelefono)
          .replace(/\{\{sucursal_email\}\}/g, empresaEmail);
        
        console.log('✅ Datos de sucursal reemplazados');
      } else {
        console.log('⚠️ No hay sucursal, usando valores del usuario o por defecto');
        htmlFinal = htmlFinal
          .replace(/\{\{sucursal_direccion\}\}/g, 'Dirección no disponible')
          .replace(/\{\{sucursal_calle\}\}/g, 'Dirección no disponible')
          .replace(/\{\{sucursal_ciudad\}\}/g, 'Ciudad')
          .replace(/\{\{sucursal_estado\}\}/g, 'Estado')
          .replace(/\{\{sucursal_codigoPostal\}\}/g, '00000')
          .replace(/\{\{sucursal_telefono\}\}/g, empresaTelefono)
          .replace(/\{\{sucursal_email\}\}/g, empresaEmail);
      }

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
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });

      await browser.close();

      console.log('✅ PDF generado exitosamente, tamaño:', pdfBuffer.length);

      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  }

  async create(createDto: CreateSalesOrderDto, userId: string): Promise<SalesOrder> {
    this.logger.log(`Creando orden de venta para usuario: ${userId}`);

    try {
      // 1. Calcular totales
      const subtotal = createDto.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice), 
        0
      );
      const tax = subtotal * 0.16; // Ajustar según tu lógica
      const total = subtotal + tax;

      // 2. Generar folio
      const folio = await this.generateFolio();

      // 3. Crear orden con status PROCESSING
      const order = this.salesOrderRepository.create({
        folio,
        userId,
        customerName: createDto.customerName,
        customerAddress: createDto.customerAddress,
        customerRfc: createDto.customerRfc,
        subtotal,
        tax,
        total,
        items: createDto.items,
        sucursalId: createDto.sucursalId,
        status: 'PROCESSING', // 👈 Estado inicial
        inventarioReservado: false,
        pdfGenerado: false,
        emailEnviado: false,
        almacenId: createDto.almacenId || 'default',
        createdBy: userId,
        usuario_id: userId,
      });

      const savedOrder = await this.salesOrderRepository.save(order);
      this.logger.log(`✓ Orden creada con folio: ${savedOrder.folio}`);

      // 4. 🔥 Publicar jobs asíncronos
      try {
        // Job 1: Reservar inventario (si aplica)
        if (createDto.reservarInventario && createDto.items.length > 0) {
          await this.queueClient.reserveStock({
            ordenVentaId: savedOrder.id,
            items: createDto.items.map(item => ({
              productoId: item.productId,
              cantidad: item.quantity
            })),
            almacenId: createDto.almacenId || 'default',
            empresaId: userId,
            userId
          });

          this.logger.log('✓ Job de reserva de inventario creado');
        }

        // Job 2: Generar PDF
        await this.queueClient.generatePDF({
          entityId: savedOrder.id,
          entityType: 'orden-venta',
          template: 'orden-venta',
          userId,
          empresaId: userId
        });

        this.logger.log('✓ Job de generación de PDF creado');

        // Job 3: Enviar email (si se solicita)
        if (createDto.enviarEmail && createDto.clienteEmail) {
          // Esperar un poco para que el PDF se genere
          await this.queueClient.sendEmail({
            to: createDto.clienteEmail,
            subject: `Orden de Venta ${savedOrder.folio}`,
            template: 'orden-venta',
            context: {
              folio: savedOrder.folio,
              cliente: savedOrder.customerName,
              total: savedOrder.total
            },
            userId,
            empresaId: userId,
            relatedEntityType: 'orden-venta',
            relatedEntityId: savedOrder.id
          }, { 
            delay: 10000 // 10 segundos de delay para que PDF esté listo
          });

          this.logger.log('✓ Job de email creado');
        }

        // Job 4: Notificar
        await this.queueClient.sendNotification({
          userId,
          empresaId: userId,
          type: 'info',
          title: 'Orden de Venta Creada',
          message: `Orden ${savedOrder.folio} creada exitosamente`,
          link: `/ordenes/${savedOrder.id}`,
          channels: ['websocket']
        });

        // 5. Actualizar estado a CONFIRMED
        await this.salesOrderRepository.update(savedOrder.id, {
          status: 'CONFIRMED'
        });

        savedOrder.status = 'CONFIRMED';

      } catch (error) {
        this.logger.error(`Error en jobs asíncronos: ${error.message}`);
        // La orden se creó pero los jobs fallaron, se reintentarán
      }

      return savedOrder;

    } catch (error) {
      this.logger.error(`Error creando orden: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== MÉTODO MODIFICADO: convertToSaleNote ==========

  async convertToSaleNote(ordenId: string, userId: string): Promise<any> {
    this.logger.log(`Convirtiendo orden ${ordenId} a nota de venta`);

    const orden = await this.salesOrderRepository.findOne({
      where: { id: ordenId, userId }
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (orden.status === 'CANCELLED') {
      throw new BadRequestException('No se puede convertir una orden cancelada');
    }

    if (orden.status === 'COMPLETED') {
      throw new BadRequestException('Esta orden ya fue convertida a nota de venta');
    }

    // TODO: Aquí llamarías al SaleNotesService.create()
    // Para este ejemplo, solo actualizamos el estado
    await this.salesOrderRepository.update(ordenId, {
      status: 'COMPLETED'
    });

    // Si había inventario reservado, ahora se debe deducir (no liberar)
    if (orden.inventarioReservado) {
      await this.queueClient.deductStockForSale({
        notaVentaId: ordenId, // O el ID de la nota creada
        items: orden.items.map(item => ({
          productoId: item.productId,
          cantidad: item.quantity
        })),
        almacenId: orden.almacenId || 'default',
        empresaId: userId,
        userId
      });
    }

    return {
      success: true,
      message: 'Orden convertida a nota de venta',
      ordenId
    };
  }

  async findAll(userId: string): Promise<SalesOrder[]> {
    return this.salesOrderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async update(id: string, updateSalesOrderDto: UpdateSalesOrderDto, userId: string): Promise<SalesOrder> {
    const order = await this.findOne(id, userId);
    const updateData = { ...updateSalesOrderDto };

    if (updateData.items) {
      const items = updateData.items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const tax = TaxCalculator.calculateIVA(subtotal);
        return {
          ...item,
          subtotal,
          tax,
          total: subtotal + tax
        };
      });

      updateData.subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      updateData.tax = items.reduce((sum, item) => sum + item.tax, 0);
      updateData.total = updateData.subtotal + updateData.tax;
      updateData.items = items;
    }

    Object.assign(order, updateData);
    return this.salesOrderRepository.save(order);
  }

  async remove(id: string, userId: string): Promise<void> {
    const order = await this.findOne(id, userId);

    if (order.status === 'COMPLETED') {
      throw new BadRequestException('No se puede eliminar una orden completada');
    }

    // Si había inventario reservado, liberarlo
    if (order.inventarioReservado && order.items?.length > 0) {
      await this.queueClient.releaseStock({
        ordenVentaId: id,
        items: order.items.map(item => ({
          productoId: item.productId,
          cantidad: item.quantity
        })),
        almacenId: order.almacenId || 'default',
        empresaId: userId,
        userId
      });

      this.logger.log('✓ Job de liberación de inventario creado');
    }

    await this.salesOrderRepository.remove(order);
    this.logger.log(`✓ Orden ${id} eliminada`);
  }

  async updateStatus(id: string, newStatus: string, userId: string): Promise<SalesOrder> {
    const order = await this.findOne(id, userId);

    const validStatuses = ['PENDING', 'PROCESSING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
    }

    // Si se cancela, liberar inventario
    if (newStatus === 'CANCELLED' && order.inventarioReservado) {
      await this.queueClient.releaseStock({
        ordenVentaId: id,
        items: order.items.map(item => ({
          productoId: item.productId,
          cantidad: item.quantity
        })),
        almacenId: order.almacenId || 'default',
        empresaId: userId,
        userId
      });
    }

    order.status = newStatus;
    return await this.salesOrderRepository.save(order);
  }

  // ========== NUEVO MÉTODO: Reenviar email ==========

  async reenviarEmail(ordenId: string, userId: string): Promise<any> {
    const order = await this.findOne(ordenId, userId);

    // Obtener email del cliente (ajustar según tu lógica)
    const clienteEmail = 'cliente@example.com'; // TODO: Obtener de la orden o cliente

    await this.queueClient.sendEmail({
      to: clienteEmail,
      subject: `Orden de Venta ${order.folio}`,
      template: 'orden-venta',
      context: {
        folio: order.folio,
        cliente: order.customerName,
        total: order.total
      },
      userId,
      empresaId: userId,
      relatedEntityType: 'orden-venta',
      relatedEntityId: ordenId
    });

    return {
      success: true,
      message: 'Email reenviado. Llegará en unos momentos.'
    };
  }

  // ========== NUEVO MÉTODO: Regenerar PDF ==========

  async regenerarPDF(ordenId: string, userId: string): Promise<any> {
    const order = await this.findOne(ordenId, userId);

    await this.queueClient.generatePDF({
      entityId: ordenId,
      entityType: 'orden-venta',
      template: 'orden-venta',
      userId,
      empresaId: userId
    });

    return {
      success: true,
      message: 'PDF regenerándose. Estará listo en unos momentos.'
    };
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async generateFolio(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `OV-${currentYear}-`;

    const lastOrder = await this.salesOrderRepository
      .createQueryBuilder('order')
      .where('order.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('order.folio', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastOrder?.folio) {
      const lastNumber = parseInt(lastOrder.folio.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
  }
  /**
 * Enviar orden de venta por email al cliente
 */
async sendSaleOrderByEmail(
    orderId: string,
    recipientEmail: string,
    customMessage: string,
    userId: string,
  ): Promise<{ jobId: string; logId: string; message: string }> {
    try {
      this.logger.log(`Enviando orden de venta ${orderId} a ${recipientEmail}`);

      // 1. Obtener la orden con sus items
      const order = await this.findOne(orderId, userId);
      // Obtener nombre de empresa
      let empresaNombre = 'Kaptah';
      try {
        const datosUsuario = await this.usuariosService.getDatosParaTemplate(userId);
        empresaNombre = datosUsuario?.sucursal_nombre || 'Kaptah';
      } catch (e) {
        this.logger.warn('No se pudo obtener nombre de empresa');
      }
      if (!order) {
        throw new NotFoundException(`Orden de venta ${orderId} no encontrada`);
      }

      // 2. Formatear items para el email
      const itemsFormatted = order.items.map(item => ({
        description: item.description || item.productName || 'Producto',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || item.price || 0),
        subtotal: Number(item.subtotal || (item.quantity * (item.unitPrice || item.price || 0))),
      }));

      // 3. Preparar datos para el email
      const emailData = {
        userId,
        organizationId: userId,
        recipientEmail,
        orderId: order.id,
        orderNumber: order.folio, // ✨ Usar folio en lugar de ID truncado
        customerName: order.customerName,
        customerAddress: order.customerAddress || 'No especificada',
        customerRfc: order.customerRfc,
        orderDate: new Date(order.createdAt).toISOString().split('T')[0],
        deliveryDate: 'Por confirmar',
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        currency: 'MXN',
        items: itemsFormatted,
        status: this.getStatusText(order.status),
        notes: '',
        customMessage: customMessage || `Confirmación de su orden de venta`,
        empresaNombre,
      };

      // 4. Enviar email
      const result = await this.emailClientService.sendSaleOrder(emailData);

      this.logger.log(
        `Orden de venta enviada. JobId: ${result.jobId}, LogId: ${result.logId}`,
      );

      return {
        ...result,
        message: `Orden de venta enviada exitosamente a ${recipientEmail}`,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando orden de venta: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

/**
 * Obtener texto del estado
 */
private getStatusText(status: string): string {
  const statusMap = {
    'PENDING': 'Pendiente',
    'CONFIRMED': 'Confirmada',
    'IN_PROGRESS': 'En Proceso',
    'COMPLETED': 'Completada',
    'CANCELLED': 'Cancelada',
  };
  return statusMap[status] || status;
}
}