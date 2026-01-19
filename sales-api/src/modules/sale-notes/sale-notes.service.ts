import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrGeneratorService } from '../cfdi/services/qr-generator.service';
import { CreateSaleNoteDto, CreateSaleNoteItemDto } from './dto/create-sale-note.dto';
import { UpdateSaleNoteDto } from './dto/update-sale-note.dto';
import { SaleNote } from './entities/sale-note.entity';
import { SucursalesService } from '../sucursales/sucursales.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { EmailClientService } from '../email-client/email-client.service';
import { SendInvoiceEmailDto } from '../email-client/dto/send-invoice-email.dto';
import { QueueClientService } from '../queue-client/queue-client.service';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import { format } from 'date-fns';
import * as puppeteer from 'puppeteer';
import axios from 'axios'; 
import * as admin from 'firebase-admin';

// ⭐ Interfaz para la respuesta del logo
interface LogoResponse {
  filename: string;
  url: string;
  type: string;
  size: number;
}
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
export class SaleNotesService {
  private readonly logger = new Logger(SaleNotesService.name);
  // ⭐ URL del otro backend
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://localhost:3000';

  constructor(
    @InjectRepository(SaleNote)
    private saleNoteRepository: Repository<SaleNote>,
    private sucursalesService: SucursalesService,
    private usuariosService: UsuariosService,
    private readonly emailClientService: EmailClientService,
    private readonly qrGeneratorService: QrGeneratorService,
    private readonly queueClient: QueueClientService,
  ) {}

 /**
 * Obtiene el logo del usuario como base64
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
      
      // 🎨 Descargar el logo y convertirlo a base64
      try {
        const logoResponse = await axios.get<ArrayBuffer>(response.data.url, {
          responseType: 'arraybuffer' // <-- Tipar como ArrayBuffer
        });
        
        // ✅ Corregir el tipado aquí
        const base64Logo = Buffer.from(logoResponse.data).toString('base64');
        const mimeType = logoResponse.headers['content-type'] || 'image/png';
        const logoDataUri = `data:${mimeType};base64,${base64Logo}`;
        
        console.log('✅ Logo convertido a base64 (primeros 50 chars):', logoDataUri.substring(0, 50));
        return logoDataUri;
      } catch (downloadError: any) {
        console.error('❌ Error descargando logo para base64:', downloadError.message);
        return response.data.url; // Fallback a URL si falla la conversión
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
   * 👇 NUEVO: Obtiene datos del cliente desde biz-entities-api por RFC
   */
  private async obtenerDatosCliente(
    rfc: string, 
    nombre: string,
    token: string
  ): Promise<ClientResponse | null> {
    try {
      console.log('👤 Buscando cliente por RFC en biz-entities-api...');
      console.log('📋 RFC:', rfc);
      
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
        console.log('⚠️ Cliente no existe en la base de datos con RFC:', rfc);
      }
      return null;
    }
  }

  private calculateSubtotal(item: CreateSaleNoteItemDto): number {
    return item.quantity * item.unitPrice;
  }

  // MÉTODO: Generar PDF con estilo
  async generarPdfEstiloRemision(
  id: string, 
  userId: string, 
  estilo: string,
  token: string | null
): Promise<Buffer> {
  console.log('📄 Iniciando generación de PDF');
  console.log('📋 Sale Note ID:', id);
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
    const saleNote = await this.findOne(id, finalUserId);
    console.log('✅ Nota de venta encontrada:', saleNote.id);

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

    // Obtener datos del cliente desde biz-entities-api
    let clienteTelefono = 'N/A';
    let clienteCiudad = 'N/A';
    let clienteDireccion = 'Dirección del cliente';

    if (saleNote.customerRfc && token) {
      const cliente = await this.obtenerDatosCliente(saleNote.customerRfc, saleNote.customerName, token);
      
      if (cliente) {
        clienteTelefono = cliente.Telefono || 'N/A';
        clienteCiudad = cliente.ciudad || cliente.Colonia || 'N/A';
        clienteDireccion = cliente.direccion || 'Dirección del cliente';
        
        console.log('✅ Datos del cliente aplicados:', {
          telefono: clienteTelefono,
          ciudad: clienteCiudad,
          direccion: clienteDireccion,
        });
      }
    }

    // Obtener datos de la sucursal desde MySQL
    let sucursal = null;
    if (saleNote.sucursalId) {
      try {
        console.log('🏢 Obteniendo sucursal con ID:', saleNote.sucursalId);
        sucursal = await this.sucursalesService.findById(saleNote.sucursalId.toString());
        console.log('✅ Sucursal encontrada:', sucursal?.nombre || 'Sin nombre');
      } catch (error) {
        console.error('⚠️ Error al obtener sucursal:', error.message);
      }
    } else {
      console.log('⚠️ La nota no tiene sucursalId asignado');
    }

    // Generar HTML de items
    const itemsHtml = saleNote.items.map(item => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const subtotal = Number(item.subtotal);
      
      return `
        <tr>
          <td>${quantity}</td>
          <td>${item.description}</td>
          <td>$${unitPrice.toFixed(2)}</td>
          <td>$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // ✅ CALCULAR SUBTOTAL E IMPUESTOS CORRECTAMENTE DESDE LOS ITEMS
    let subtotalTotal = 0;
    let impuestosTotal = 0;

    saleNote.items.forEach(item => {
      subtotalTotal += Number(item.subtotal);
      impuestosTotal += Number(item.taxesTotal);
    });

    const total = subtotalTotal + impuestosTotal;

    console.log('💰 Cálculos finales:', {
      subtotal: subtotalTotal.toFixed(2),
      impuestos: impuestosTotal.toFixed(2),
      total: total.toFixed(2)
    });

    // Preparar datos de la empresa con prioridad correcta
    const empresaNombre = datosUsuario?.sucursal_nombre || sucursal?.nombre || 'Mi Empresa';
    const empresaRfc = datosUsuario?.empresa_rfc || 'XAXX010101000';
    const empresaTelefono = datosUsuario?.empresa_telefono || sucursal?.telefono || 'Sin teléfono';
    const empresaEmail = datosUsuario?.empresa_email || 'contacto@empresa.com';

    console.log('🏢 Datos de la empresa para el PDF:', {
      nombre: empresaNombre,
      rfc: empresaRfc,
      telefono: empresaTelefono,
      email: empresaEmail,
    });

    // 👇 GENERAR QR AQUÍ (después de calcular total y obtener empresaRfc)
    console.log('📱 Generando código QR para la nota...');
    
    let qrCodeImage = '';
    try {
      // Convertir fecha a string en formato ISO
      const fechaString = new Date(saleNote.saleDate).toISOString();
      
      const qrData = await this.qrGeneratorService.generateNoteQR({
        folio: saleNote.folio,
        fecha: fechaString, // 👈 Convertida a string
        rfcEmisor: empresaRfc, // 👈 Ya está declarada
        total: total, // 👈 Ya está declarada
        clienteNombre: saleNote.customerName
      });

      qrCodeImage = qrData.image; // Base64 del QR
      console.log('✅ Código QR generado exitosamente');
      console.log('🔗 URL de verificación:', qrData.url);
    } catch (qrError) {
      console.error('⚠️ Error generando QR, continuando sin él:', qrError.message);
      // Generar un QR placeholder transparente de 1x1 pixel
      qrCodeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    // Extraer día, mes y año de la fecha
    const fecha = new Date(saleNote.saleDate);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();

    // Reemplazar variables en el template
    let htmlFinal = templateHtml
  .replace('{{logo}}', logoDataUri)
  .replace(/\{\{tipo_documento\}\}/g, 'NOTA DE REMISIÓN')
  .replace('{{fecha}}', format(fecha, 'dd/MM/yyyy'))  // Este reemplaza el de arriba
  .replace(/\{\{dia\}\}/g, dia)
  .replace(/\{\{mes\}\}/g, mes)
  .replace(/\{\{anio\}\}/g, anio)
  .replace('{{folio}}', saleNote.folio)  // Este reemplaza el de arriba
  .replace(/\{\{cliente\}\}/g, saleNote.customerName || 'Cliente')
  .replace(/\{\{direccion\}\}/g, clienteDireccion)
  .replace(/\{\{rfc\}\}/g, saleNote.customerRfc || 'N/A')
  .replace(/\{\{telefono\}\}/g, clienteTelefono)
  .replace(/\{\{ciudad\}\}/g, clienteCiudad)
  .replace('{{items}}', itemsHtml)
  .replace('{{subtotal}}', subtotalTotal.toFixed(2))
  .replace('{{impuestos}}', impuestosTotal.toFixed(2))
  .replace('{{total}}', total.toFixed(2))
  .replace(/\{\{qr_code\}\}/g, qrCodeImage)
  // 👇 AGREGAR ESTOS REEMPLAZOS PARA EL QR
  .replace(/\{\{qr_folio\}\}/g, saleNote.folio)
  .replace(/\{\{qr_fecha\}\}/g, format(fecha, 'dd/MM/yyyy'))
  // Reemplazar datos de la empresa emisora
  .replace(/\{\{sucursal_nombre\}\}/g, empresaNombre)
  .replace(/\{\{empresa_nombre\}\}/g, empresaNombre)
  .replace(/\{\{empresa_rfc\}\}/g, empresaRfc);

    // Reemplazar variables de la sucursal (dirección física)
    if (sucursal) {
      console.log('📝 Reemplazando variables de sucursal...');
      
      htmlFinal = htmlFinal
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
      margin: { top: '8px', bottom: '8px', left: '8px', right: '8px' },
    });

    await browser.close();

    console.log('✅ PDF generado exitosamente con QR, tamaño:', pdfBuffer.length);

    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    throw error;
  }
}

  /**
   * 🎯 Genera el siguiente folio en formato NV-YYYY-NNNN
   * Ejemplo: NV-2025-0001, NV-2025-0002, etc.
   */
  private async generateFolio(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `NV-${currentYear}-`;

    // Buscar el último folio del año actual
    const lastSaleNote = await this.saleNoteRepository
      .createQueryBuilder('saleNote')
      .where('saleNote.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('saleNote.folio', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastSaleNote?.folio) {
      // Extraer el número del último folio: NV-2025-0001 -> 0001 -> 1
      const lastNumber = parseInt(lastSaleNote.folio.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `${prefix}${formattedNumber}`;
  }

  async create(createSaleNoteDto: CreateSaleNoteDto, userId: string): Promise<SaleNote> {
  const items = createSaleNoteDto.items.map(item => {
    const subtotal = item.quantity * item.unitPrice;
    const taxes = item.taxes || [];
    const taxesTotal = taxes.reduce((sum, tax) => sum + Number(tax.amount), 0);
    
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      description: item.description,
      subtotal,
      taxes,
      taxesTotal,
      total: subtotal + taxesTotal,
    };
  });

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const folio = await this.generateFolio();

  const saleNote = this.saleNoteRepository.create({
    folio,
    customerName: createSaleNoteDto.customerName,
    customerRfc: createSaleNoteDto.customerRfc,
    saleDate: new Date(),
    total,
    items,
    paymentMethod: createSaleNoteDto.paymentMethod,
    status: 'PROCESSING', // 👈 CAMBIAR DE 'COMPLETED' A 'PROCESSING'
    userId,
    sucursalId: createSaleNoteDto.sucursalId,
    createdBy: userId,
  });

  const savedNote = await this.saleNoteRepository.save(saleNote);

  // 👇 AGREGAR: Jobs asíncronos
  try {
    // 1. Deducir inventario (si aplica)
    if (createSaleNoteDto.afectaInventario && items.length > 0) {
      await this.queueClient.deductStockForSale({
        notaVentaId: savedNote.id,
        items: items.map(item => ({
          productoId: item.productId,
          cantidad: item.quantity
        })),
        almacenId: createSaleNoteDto.almacenId || 'default',
        empresaId: userId, // O el empresaId real
        userId
      });
    }

    // 2. Generar PDF
    await this.queueClient.generateSaleNotePDF(savedNote.id);

    // 3. Enviar email (si se solicita)
    if (createSaleNoteDto.enviarEmail && createSaleNoteDto.clienteEmail) {
      await this.queueClient.sendSaleNoteEmail(
        savedNote.id,
        createSaleNoteDto.clienteEmail
      );
    }

    // 4. Actualizar estado a COMPLETED
    await this.saleNoteRepository.update(savedNote.id, { 
      status: 'COMPLETED' 
    });

  } catch (error) {
    this.logger.error(`Error en jobs asíncronos: ${error.message}`);
    // La nota se creó pero los jobs fallaron, se reintentarán automáticamente
  }

  return savedNote;
}

  async findAll(userId: string): Promise<SaleNote[]> {
    return this.saleNoteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<SaleNote> {
    const saleNote = await this.saleNoteRepository.findOne({
      where: { id, userId },
    });

    if (!saleNote) {
      throw new NotFoundException(`Nota de venta con ID ${id} no encontrada`);
    }

    return saleNote;
  }

  // 🔍 Nuevo método: Buscar por folio
  async findByFolio(folio: string, userId: string): Promise<SaleNote> {
    const saleNote = await this.saleNoteRepository.findOne({
      where: { folio, userId },
    });

    if (!saleNote) {
      throw new NotFoundException(`Nota de venta con folio ${folio} no encontrada`);
    }

    return saleNote;
  }

  async update(id: string, updateSaleNoteDto: UpdateSaleNoteDto, userId: string): Promise<SaleNote> {
    const saleNote = await this.findOne(id, userId);

    // Recalcular total si se actualizan los items
    if (updateSaleNoteDto.items) {
      const total = updateSaleNoteDto.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const items = updateSaleNoteDto.items.map(item => ({
        ...item,
        subtotal: item.quantity * item.unitPrice,
      }));

      Object.assign(saleNote, { ...updateSaleNoteDto, items, total });
    } else {
      Object.assign(saleNote, updateSaleNoteDto);
    }

    return this.saleNoteRepository.save(saleNote);
  }

  async remove(id: string, userId: string): Promise<void> {
    const saleNote = await this.findOne(id, userId);
    await this.saleNoteRepository.remove(saleNote);
  }

  // 📊 Método auxiliar: Obtener estadísticas de folios por año
  async getFolioStats(year?: number): Promise<{ year: number; count: number; lastFolio: string }> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `NV-${currentYear}-`;

    const count = await this.saleNoteRepository
      .createQueryBuilder('saleNote')
      .where('saleNote.folio LIKE :pattern', { pattern: `${prefix}%` })
      .getCount();

    const lastSaleNote = await this.saleNoteRepository
      .createQueryBuilder('saleNote')
      .where('saleNote.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('saleNote.folio', 'DESC')
      .getOne();

    return {
      year: currentYear,
      count,
      lastFolio: lastSaleNote?.folio || `${prefix}0000`,
    };
  }
 async sendSaleNoteByEmail(
  id: string,
  recipientEmail: string,
  customMessage: string,
  userId: string,
  idToken: string,
  pdfStyle: string = 'classic',
): Promise<{ jobId: string; message: string }> {
  try {
    this.logger.log(`📧 ===== INICIANDO ENVÍO DE EMAIL VÍA COLA =====`);
    
    // 1. Validar que la nota existe
    const saleNote = await this.findOne(id, userId);

    if (!saleNote) {
      throw new Error(`Nota de venta ${id} no encontrada`);
    }

    // 2. Publicar job a la cola de email
    // La cola se encargará de generar PDF, obtener logo, etc.
    const job = await this.queueClient.sendSaleNoteEmail(
      id,
      recipientEmail
    );

    this.logger.log(`✅ Job de email creado: ${job.id}`);

    return {
      jobId: job.id.toString(),
      message: `Email en cola de envío. Llegará en unos momentos.`
    };

  } catch (error) {
    this.logger.error(`❌ Error encolando email: ${error.message}`, error.stack);
    throw new Error(`Error encolando email: ${error.message}`);
  }
}

/**
 * Helper para obtener texto del método de pago
 */
private getPaymentMethodText(method: 'CASH' | 'CARD' | 'TRANSFER'): string {
  const methods = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
  };
  return methods[method] || method;
}
}