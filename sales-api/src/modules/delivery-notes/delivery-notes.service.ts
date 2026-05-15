import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryNote } from './entities/delivery-note.entity';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { SucursalesService } from '../sucursales/sucursales.service'; 
import { EmailClientService } from '../email-client/email-client.service';
import { QueueClientService } from '../queue-client/queue-client.service';
import * as fs from 'fs'; 
import * as path from 'path'; 
import { Buffer } from 'buffer'; 
import { format } from 'date-fns'; 
import * as puppeteer from 'puppeteer'; 
import axios from 'axios';
// ✨ NUEVO: Constantes para valores por defecto
const DEFAULT_SUCURSAL_VALUES = {
  alias: 'Matriz',
  direccion: 'Dirección no disponible',
  ciudad: 'Ciudad',
  estado: '',
  codigoPostal: '00000',
  telefono: 'Teléfono no disponible',
  email: 'correo@empresa.com'
};

@Injectable()
export class DeliveryNotesService {
  private readonly logger = new Logger(DeliveryNotesService.name);
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL;
  constructor(
    @InjectRepository(DeliveryNote)
    private deliveryNoteRepository: Repository<DeliveryNote>,
    private sucursalesService: SucursalesService,
    private emailClientService: EmailClientService,
    private readonly queueClient: QueueClientService,
    private readonly usuariosService: UsuariosService,
  ) {}

   /**
   * 🔍 Buscar nota por folio
   */
  async findByFolio(folio: string, userId: string): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { folio, userId },
      relations: ['salesOrder']
    });

    if (!note) {
      throw new NotFoundException(`Nota de remisión con folio ${folio} no encontrada`);
    }

    return note;
  }

  /**
   * 📊 Obtener estadísticas de folios por año
   */
  async getFolioStats(year?: number): Promise<{ year: number; count: number; lastFolio: string }> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `REM-${currentYear}-`;

    const count = await this.deliveryNoteRepository
      .createQueryBuilder('deliveryNote')
      .where('deliveryNote.folio LIKE :pattern', { pattern: `${prefix}%` })
      .getCount();

    const lastNote = await this.deliveryNoteRepository
      .createQueryBuilder('deliveryNote')
      .where('deliveryNote.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('deliveryNote.folio', 'DESC')
      .getOne();

    return {
      year: currentYear,
      count,
      lastFolio: lastNote?.folio || `${prefix}0000`,
    };
  }

  async create(createDto: CreateDeliveryNoteDto, userId: string): Promise<DeliveryNote> {
    this.logger.log(`Creando nota de entrega para usuario: ${userId}`);

    try {
      // 1. Validar que la orden de venta existe
      // const salesOrder = await this.validateSalesOrder(createDto.salesOrderId, userId);

      // 2. Generar folio
      const folio = await this.generateFolio();

      // 3. Crear nota de entrega
      const deliveryNote = this.deliveryNoteRepository.create({
        folio,
        salesOrderId: createDto.salesOrderId,
        userId,
        sucursalId: createDto.sucursalId,
        deliveryDate: new Date(),
        status: 'PROCESSING', // 👈 Estado inicial
        items: createDto.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          description: item.description,
          deliveredQuantity: item.deliveredQuantity || item.quantity
        })),
        inventarioAfectado: false,
        pdfGenerado: false,
        emailEnviado: false,
        almacenId: createDto.almacenId || 'default',
        notasEntrega: createDto.notasEntrega,
        createdBy: userId,
      });

      const savedNote = await this.deliveryNoteRepository.save(deliveryNote);
      this.logger.log(`✓ Nota de entrega creada con folio: ${savedNote.folio}`);

      // 4. 🔥 Publicar jobs asíncronos
      try {
        // Job 1: Deducir inventario (si aplica)
        if (createDto.afectarInventario !== false && createDto.items.length > 0) {
          await this.queueClient.deductStockForSale({
            notaVentaId: savedNote.id,
            items: createDto.items.map(item => ({
              productoId: item.productId,
              cantidad: item.deliveredQuantity || item.quantity
            })),
            almacenId: createDto.almacenId || 'default',
            empresaId: userId,
            userId
          });

          this.logger.log('✓ Job de deducción de inventario creado');
        }

        // Job 2: Generar PDF
        await this.queueClient.generatePDF({
          entityId: savedNote.id,
          entityType: 'nota-entrega',
          template: 'nota-entrega',
          userId,
          empresaId: userId
        });

        this.logger.log('✓ Job de generación de PDF creado');

        // Job 3: Enviar email (si se solicita)
        if (createDto.enviarEmail && createDto.clienteEmail) {
          await this.queueClient.sendEmail({
            to: createDto.clienteEmail,
            subject: `Nota de Entrega ${savedNote.folio}`,
            template: 'nota-entrega',
            context: {
              folio: savedNote.folio,
              fechaEntrega: savedNote.deliveryDate,
              items: savedNote.items
            },
            userId,
            empresaId: userId,
            relatedEntityType: 'nota-venta', // Usar el mismo tipo que sale-notes
            relatedEntityId: savedNote.id
          }, {
            delay: 10000 // 10 segundos para que PDF esté listo
          });

          this.logger.log('✓ Job de email creado');
        }

        // Job 4: Notificar
        await this.queueClient.sendNotification({
          userId,
          empresaId: userId,
          type: 'info',
          title: 'Nota de Entrega Creada',
          message: `Nota de entrega ${savedNote.folio} creada exitosamente`,
          link: `/delivery-notes/${savedNote.id}`,
          channels: ['websocket']
        });

        // 5. Actualizar estado
        await this.deliveryNoteRepository.update(savedNote.id, {
          status: 'PENDING',
          inventarioAfectado: createDto.afectarInventario !== false
        });

        savedNote.status = 'PENDING';

      } catch (error) {
        this.logger.error(`Error en jobs asíncronos: ${error.message}`);
        // La nota se creó pero los jobs fallaron
      }

      return savedNote;

    } catch (error) {
      this.logger.error(`Error creando nota de entrega: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(userId: string): Promise<DeliveryNote[]> {
    return this.deliveryNoteRepository.find({
      where: { userId },
      relations: ['salesOrder'],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, userId: string): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id, userId },
      relations: ['salesOrder']
    });
    if (!note) throw new NotFoundException(`Delivery note with ID "${id}" not found`);
    return note;
  }

  async update(id: string, updateDto: UpdateDeliveryNoteDto, userId: string): Promise<DeliveryNote> {
    const deliveryNote = await this.findOne(id, userId);

    // Si se marca como entregada, registrar fecha
    if (updateDto.status === 'DELIVERED' && deliveryNote.status !== 'DELIVERED') {
      updateDto['fechaEntrega'] = new Date();
    }

    // Si se cancela y ya se afectó inventario, revertir
    if (updateDto.status === 'CANCELLED' && deliveryNote.inventarioAfectado) {
      await this.queueClient.reserveStock({ // Usar reserveStock para "devolver"
        ordenVentaId: id,
        items: deliveryNote.items.map(item => ({
          productoId: item.productId,
          cantidad: item.deliveredQuantity || item.quantity
        })),
        almacenId: deliveryNote.almacenId || 'default',
        empresaId: userId,
        userId
      });

      this.logger.log('✓ Job de reversión de inventario creado');
    }

    Object.assign(deliveryNote, updateDto);
    return await this.deliveryNoteRepository.save(deliveryNote);
  }

  async remove(id: string, userId: string): Promise<void> {
    const deliveryNote = await this.findOne(id, userId);

    if (deliveryNote.status === 'DELIVERED') {
      throw new BadRequestException('No se puede eliminar una nota de entrega ya completada');
    }

    // Si se afectó inventario, revertirlo
    if (deliveryNote.inventarioAfectado && deliveryNote.items?.length > 0) {
      await this.queueClient.reserveStock({ // "Devolver" al inventario
        ordenVentaId: id,
        items: deliveryNote.items.map(item => ({
          productoId: item.productId,
          cantidad: item.deliveredQuantity || item.quantity
        })),
        almacenId: deliveryNote.almacenId || 'default',
        empresaId: userId,
        userId
      });

      this.logger.log('✓ Job de reversión de inventario creado');
    }

    await this.deliveryNoteRepository.remove(deliveryNote);
    this.logger.log(`✓ Nota de entrega ${id} eliminada`);
  }
private async obtenerLogoUsuario(userId: string, token: string, cuentaUid?: string): Promise<string | null> {
    try {
      const cuentaParam = cuentaUid ? `?cuentaUid=${cuentaUid}` : '';
      const logoApiUrl = `${this.bizEntitiesApiUrl}/api/logos/current${cuentaParam}`;
      console.log('🔍 Solicitando logo al biz-entities-api:', logoApiUrl);
      const response = await axios.get<{ url?: string }>(logoApiUrl, {
        headers: {
          'Authorization': token,
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
      if (response.data?.url) {
        console.log('✅ Logo URL obtenida:', response.data.url);
        const logoResponse = await axios.get<ArrayBuffer>(response.data.url, { responseType: 'arraybuffer' });
        const base64Logo = Buffer.from(logoResponse.data).toString('base64');
        const mimeType = logoResponse.headers['content-type'] || 'image/png';
        return `data:${mimeType};base64,${base64Logo}`;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo logo:', error.message);
      return null;
    }
  }

  // ✨ NUEVO: Generar PDF con soporte de sucursales
  async generarPdfEstiloRemision(id: string, userId: string, estilo: string = 'profesional', token?: string, cuentaUid?: string): Promise<Buffer> {
    console.log('📄 Iniciando generación de PDF de Nota de Entrega');
    console.log('📋 Delivery Note ID:', id);
    console.log('👤 User ID:', userId);
    console.log('🎨 Estilo:', estilo);

    try {
      const deliveryNote = await this.findOne(id, userId);
      console.log('✅ Nota de entrega encontrada:', deliveryNote.id);

      const templatesPath = path.join(process.cwd(), 'src', 'templates');
      
      const htmlPath = path.join(templatesPath, `remision-${estilo}.html`);
      const templateHtml = fs.readFileSync(htmlPath, 'utf8');
      // Obtener logo dinamico del usuario/cuenta
      let logoDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      if (token) {
        const finalCuentaUid = cuentaUid || userId;
        const logoFromApi = await this.obtenerLogoUsuario(userId, token, finalCuentaUid);
        if (logoFromApi) {
          logoDataUri = logoFromApi;
          console.log('✅ Usando logo del usuario desde API');
        } else {
          console.log('⚠️ No se obtuvo logo, usando pixel transparente');
        }
      } else {
        console.log('⚠️ No hay token, usando pixel transparente');
      }

      console.log('✅ Archivos leídos correctamente');

      // ✨ NUEVO: Obtener datos de la sucursal desde MySQL
      let sucursal = null;
      if (deliveryNote.sucursalId) {
        try {
          console.log('🏢 Obteniendo sucursal con ID:', deliveryNote.sucursalId);
          sucursal = await this.sucursalesService.findById(deliveryNote.sucursalId);
          console.log('✅ Sucursal encontrada:', sucursal?.alias || 'Sin alias');
        } catch (error) {
          console.error('⚠️ Error al obtener sucursal:', error.message);
          // Continuar sin sucursal
        }
      } else {
        console.log('ℹ️ La nota de entrega no tiene sucursalId asignado');
      }

      // Generar HTML de items (si existen)
      let itemsHtml = '';
      if (deliveryNote.items && deliveryNote.items.length > 0) {
        itemsHtml = deliveryNote.items.map(item => `
          <tr>
            <td>${item.quantity || 0}</td>
            <td>${item.description || item.productId || 'Producto'}</td>
            <td>-</td>
            <td>-</td>
          </tr>
        `).join('');
      } else {
        // Si no hay items, agregar una fila vacía
        itemsHtml = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
              No hay items en esta nota de entrega
            </td>
          </tr>
        `;
      }

      // Información del cliente (obtenida de la orden de venta si existe)
      const customerName = deliveryNote.salesOrder?.customerName || 'Cliente - Orden: ' + deliveryNote.salesOrderId.slice(0, 8);
      const customerAddress = deliveryNote.salesOrder?.customerAddress || 'Ver orden de venta para detalles';
      const customerRfc = deliveryNote.salesOrder?.customerRfc || 'N/A';
      // Obtener datos del usuario/empresa
      const ownerUid = cuentaUid || userId;
      let datosUsuario = null;
      try {
        datosUsuario = await this.usuariosService.getDatosParaTemplate(ownerUid);
        console.log('✅ Datos del usuario obtenidos:', {
          nombre: datosUsuario?.sucursal_nombre,
          rfc: datosUsuario?.empresa_rfc,
        });
      } catch (error) {
        console.error('⚠️ Error al obtener datos del usuario:', error.message);
      }

      const empresaNombre = datosUsuario?.sucursal_nombre || sucursal?.alias || 'Mi Empresa';
      const empresaRfc = datosUsuario?.empresa_rfc || 'XAXX010101000';

      // Separar fecha
      const fechaEntrega = new Date(deliveryNote.deliveryDate || deliveryNote.createdAt);
      const dia = fechaEntrega.getDate().toString().padStart(2, '0');
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const mes = meses[fechaEntrega.getMonth()];
      const anio = fechaEntrega.getFullYear().toString();
      // Reemplazar variables básicas
      let htmlFinal = templateHtml
        .replace('{{logo}}', logoDataUri)
        .replace(/\{\{tipo_documento\}\}/g, 'NOTA DE ENTREGA') // ✨ NUEVO: Título específico
        .replace('{{fecha}}', format(new Date(deliveryNote.deliveryDate || deliveryNote.createdAt), 'dd/MM/yyyy'))
        .replace('{{folio}}', deliveryNote.folio)
        .replace('{{cliente}}', customerName)
        .replace('{{direccion}}', customerAddress)
        .replace('{{rfc}}', customerRfc)
        .replace('{{telefono}}', 'N/A')
        .replace('{{ciudad}}', 'N/A')
        .replace('{{items}}', itemsHtml)
        .replace('{{subtotal}}', '0.00')
        .replace('{{impuestos}}', '0.00')
        .replace('{{total}}', '0.00')
        .replace(/\{\{dia\}\}/g, dia)
        .replace(/\{\{mes\}\}/g, mes)
        .replace(/\{\{anio\}\}/g, anio)
        .replace(/\{\{sucursal_nombre\}\}/g, empresaNombre)
        .replace(/\{\{empresa_nombre\}\}/g, empresaNombre)
        .replace(/\{\{empresa_rfc\}\}/g, empresaRfc)
        .replace(/\{\{observaciones\}\}/g, deliveryNote.notasEntrega || 'Sin observaciones')
        .replace(/\{\{qr_folio\}\}/g, deliveryNote.folio || '')
        .replace(/\{\{qr_fecha\}\}/g, format(fechaEntrega, 'dd/MM/yyyy'));

      // ✨ NUEVO: Reemplazar variables de la sucursal
      if (sucursal) {
        console.log('🔄 Reemplazando variables de sucursal...');
        console.log('  📍 Dirección:', sucursal.direccion);
        console.log('  🏙️ Colonia:', sucursal.colonia);
        console.log('  📮 Código Postal:', sucursal.codigoPostal);
        console.log('  📞 Teléfono:', sucursal.telefono);
        
        htmlFinal = htmlFinal
          .replace(/\{\{sucursal_alias\}\}/g, sucursal.alias || DEFAULT_SUCURSAL_VALUES.alias)
          .replace(/\{\{sucursal_direccion\}\}/g, sucursal.direccion || DEFAULT_SUCURSAL_VALUES.direccion)
          .replace(/\{\{sucursal_calle\}\}/g, sucursal.direccion || DEFAULT_SUCURSAL_VALUES.direccion)
          .replace(/\{\{sucursal_ciudad\}\}/g, sucursal.colonia || DEFAULT_SUCURSAL_VALUES.ciudad)
          .replace(/\{\{sucursal_estado\}\}/g, DEFAULT_SUCURSAL_VALUES.estado)
          .replace(/\{\{sucursal_codigoPostal\}\}/g, sucursal.codigoPostal || DEFAULT_SUCURSAL_VALUES.codigoPostal)
          .replace(/\{\{sucursal_telefono\}\}/g, sucursal.telefono || DEFAULT_SUCURSAL_VALUES.telefono)
          .replace(/\{\{sucursal_email\}\}/g, DEFAULT_SUCURSAL_VALUES.email);
        
        console.log('✅ Datos de sucursal reemplazados en el template');
        
        // Verificar que los placeholders fueron reemplazados
        if (htmlFinal.includes('{{sucursal_')) {
          console.log('⚠️ ADVERTENCIA: Aún quedan placeholders sin reemplazar');
          const remaining = htmlFinal.match(/\{\{sucursal_[^}]+\}\}/g);
          console.log('   Placeholders restantes:', remaining);
        } else {
          console.log('✅ Todos los placeholders de sucursal fueron reemplazados');
        }
      } else {
        console.log('ℹ️ No hay sucursal, usando valores por defecto');
        htmlFinal = htmlFinal
          .replace(/\{\{sucursal_alias\}\}/g, DEFAULT_SUCURSAL_VALUES.alias)
          .replace(/\{\{sucursal_direccion\}\}/g, DEFAULT_SUCURSAL_VALUES.direccion)
          .replace(/\{\{sucursal_calle\}\}/g, DEFAULT_SUCURSAL_VALUES.direccion)
          .replace(/\{\{sucursal_ciudad\}\}/g, DEFAULT_SUCURSAL_VALUES.ciudad)
          .replace(/\{\{sucursal_estado\}\}/g, DEFAULT_SUCURSAL_VALUES.estado)
          .replace(/\{\{sucursal_codigoPostal\}\}/g, DEFAULT_SUCURSAL_VALUES.codigoPostal)
          .replace(/\{\{sucursal_telefono\}\}/g, DEFAULT_SUCURSAL_VALUES.telefono)
          .replace(/\{\{sucursal_email\}\}/g, DEFAULT_SUCURSAL_VALUES.email);
        console.log('✅ Usando valores por defecto para sucursal');
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

      console.log('✅ PDF de nota de entrega generado exitosamente, tamaño:', pdfBuffer.length);

      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  }
  /**
 * Enviar nota de entrega por email
 */
async sendDeliveryNoteByEmail(
    id: string,
    recipientEmail: string,
    customMessage: string,
    userId: string
  ): Promise<any> {
    this.logger.log(`Enviando nota de entrega ${id} por email`);

    try {
      const deliveryNote = await this.findOne(id, userId);

      if (!deliveryNote) {
        throw new NotFoundException(`Nota de entrega ${id} no encontrada`);
      }

      // 1. Obtener nombre de empresa
      let empresaNombre = 'Kaptah';
      try {
        const datosUsuario = await this.usuariosService.getDatosParaTemplate(userId);
        empresaNombre = datosUsuario?.sucursal_nombre || 'Kaptah';
      } catch (e) {
        this.logger.warn('No se pudo obtener nombre de empresa');
      }

      // 2. Generar PDF
      let pdfBase64: string | null = null;
      try {
        this.logger.log('📄 Generando PDF de nota de entrega para adjuntar al email...');
        const pdfBuffer = await this.generarPdfEstiloRemision(id, userId, 'profesional');
        pdfBase64 = pdfBuffer.toString('base64');
        this.logger.log('✅ PDF generado, tamaño base64: ' + pdfBase64.length);
      } catch (e) {
        this.logger.warn('⚠️ No se pudo generar PDF: ' + e.message);
      }

      // 3. Encolar job con datos completos
      const job = await this.queueClient.sendDeliveryNoteEmail({
        deliveryNoteId: id,
        clienteEmail: recipientEmail,
        folio: deliveryNote.folio,
        salesOrderId: deliveryNote.salesOrderId,
        deliveryDate: deliveryNote.deliveryDate?.toISOString() || new Date().toISOString(),
        status: deliveryNote.status,
        items: deliveryNote.items || [],
        empresaNombre,
        customMessage,
        pdfBase64,
      });

      this.logger.log(`✅ Job de email de nota de entrega creado: ${job.id}`);

      // 4. Actualizar estado
      await this.deliveryNoteRepository.update(id, {
        emailEnviado: true
      });

      return {
        success: true,
        jobId: job.id.toString(),
        message: `Nota de entrega enviada a ${recipientEmail}. Llegará en unos momentos.`
      };

    } catch (error) {
      this.logger.error(`Error enviando nota de entrega: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== NUEVO MÉTODO: Reenviar email ==========

  async reenviarEmail(deliveryNoteId: string, userId: string): Promise<any> {
    const deliveryNote = await this.findOne(deliveryNoteId, userId);

    // Obtener email del cliente (ajustar según tu lógica)
    const clienteEmail = 'cliente@example.com'; // TODO: Obtener del salesOrder

    await this.queueClient.sendEmail({
      to: clienteEmail,
      subject: `Nota de Entrega ${deliveryNote.folio}`,
      template: 'nota-entrega',
      context: {
        folio: deliveryNote.folio,
        fechaEntrega: deliveryNote.deliveryDate,
        items: deliveryNote.items
      },
      userId,
      empresaId: userId,
      relatedEntityType: 'nota-venta',
      relatedEntityId: deliveryNoteId
    });

    return {
      success: true,
      message: 'Email reenviado. Llegará en unos momentos.'
    };
  }

  // ========== NUEVO MÉTODO: Regenerar PDF ==========

  async regenerarPDF(deliveryNoteId: string, userId: string): Promise<any> {
    const deliveryNote = await this.findOne(deliveryNoteId, userId);

    await this.queueClient.generatePDF({
      entityId: deliveryNoteId,
      entityType: 'nota-entrega',
      template: 'nota-entrega',
      userId,
      empresaId: userId
    });

    return {
      success: true,
      message: 'PDF regenerándose. Estará listo en unos momentos.'
    };
  }

  // ========== NUEVO MÉTODO: Marcar como entregada ==========

  async marcarComoEntregada(
    deliveryNoteId: string, 
    userId: string,
    receptorNombre?: string,
    firmaReceptor?: string
  ): Promise<DeliveryNote> {
    const deliveryNote = await this.findOne(deliveryNoteId, userId);

    if (deliveryNote.status === 'DELIVERED') {
      throw new BadRequestException('Esta nota ya fue marcada como entregada');
    }

    if (deliveryNote.status === 'CANCELLED') {
      throw new BadRequestException('No se puede marcar como entregada una nota cancelada');
    }

    await this.deliveryNoteRepository.update(deliveryNoteId, {
      status: 'DELIVERED',
      fechaEntrega: new Date(),
      receptorNombre,
      firmaReceptor
    });

    // Notificar
    await this.queueClient.sendNotification({
      userId,
      empresaId: userId,
      type: 'info',
      title: 'Entrega Completada',
      message: `Nota de entrega ${deliveryNote.folio} marcada como entregada`,
      link: `/delivery-notes/${deliveryNoteId}`,
      channels: ['websocket']
    });

    return await this.findOne(deliveryNoteId, userId);
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async generateFolio(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `REM-${currentYear}-`;

    const lastNote = await this.deliveryNoteRepository
      .createQueryBuilder('note')
      .where('note.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('note.folio', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastNote?.folio) {
      const lastNumber = parseInt(lastNote.folio.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
  }

/**
 * Obtener texto del estado
 */
private getStatusText(status: string): string {
  const statusMap = {
    'PENDING': 'Pendiente',
    'DELIVERED': 'Entregada',
    'CANCELLED': 'Cancelada',
  };
  return statusMap[status] || status;
}
}