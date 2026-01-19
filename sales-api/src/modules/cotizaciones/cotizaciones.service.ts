import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateUtils } from '../../utils/date.utils';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Cotizacion } from './entities/cotizacion.entity';
import { CotizacionItem } from './entities/cotizacion-item.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { SucursalesService } from '../sucursales/sucursales.service';
import { EmailClientService } from '../email-client/email-client.service';
import { SendQuotationEmailDto } from '../email-client/dto/send-quotation-email.dto';
import { QueueClientService } from '../queue-client/queue-client.service';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import { format } from 'date-fns';
import * as puppeteer from 'puppeteer';
import axios from 'axios';
import * as admin from 'firebase-admin'; 
interface LogoResponse {
  filename: string;
  url: string;
  type: string;
  size: number;
}
@Injectable()
export class CotizacionesService {
  private readonly logger = new Logger(CotizacionesService.name);
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://127.0.0.1:3000';


  constructor(
    @InjectRepository(Cotizacion)
    private cotizacionRepository: Repository<Cotizacion>,

    @InjectRepository(CotizacionItem)
    private cotizacionItemRepository: Repository<CotizacionItem>,    
    private sucursalesService: SucursalesService,
    private usuariosService: UsuariosService,
    private readonly emailClientService: EmailClientService,
    private readonly queueClient: QueueClientService,
  ) {}
 
/**
 * 🔍 Buscar cotización por folio
 */
async findByFolio(folio: string): Promise<Cotizacion> {
  const quote = await this.cotizacionRepository.findOne({
    where: { folio },
    relations: ['items']
  });

  if (!quote) {
    throw new NotFoundException(`Cotización con folio ${folio} no encontrada`);
  }

  return quote;
}

/**
 * 📊 Obtener estadísticas de folios por año
 */
async getFolioStats(year?: number): Promise<{ year: number; count: number; lastFolio: string }> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `COT-${currentYear}-`;

  const count = await this.cotizacionRepository
    .createQueryBuilder('cotizacion')
    .where('cotizacion.folio LIKE :pattern', { pattern: `${prefix}%` })
    .getCount();

  const lastQuote = await this.cotizacionRepository
    .createQueryBuilder('cotizacion')
    .where('cotizacion.folio LIKE :pattern', { pattern: `${prefix}%` })
    .orderBy('cotizacion.folio', 'DESC')
    .getOne();

  return {
    year: currentYear,
    count,
    lastFolio: lastQuote?.folio || `${prefix}0000`,
  };
}
/**
 * ⭐ Obtiene el logo del usuario desde biz-entities-api
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
  // ✨ MÉTODO ACTUALIZADO: Generar PDF con estilo (IGUAL QUE SALE NOTES)
  async generarPdfEstiloCotizacion(
  id: number, 
  estilo: string,
  token: string | null
): Promise<Buffer> {
  console.log('📄 Iniciando generación de PDF');
  console.log('📋 Cotizacion ID:', id);
  console.log('🎨 Estilo:', estilo);
  console.log('🔑 Token disponible:', token ? 'Sí' : 'No');

  // ⭐ Si hay token, extraer userId
  let userId: string | null = null;
  let datosUsuario = null; // 👈 NUEVO: Variable para datos del usuario
  
  if (token) {
    try {
      console.log('🔍 Extrayendo userId del token de Firebase...');
      const cleanToken = token.replace('Bearer ', '');
      const decodedToken = await admin.auth().verifyIdToken(cleanToken);
      userId = decodedToken.uid;
      console.log('✅ User ID extraído del token:', userId);

      // 👇 NUEVO: Obtener datos del usuario
      try {
        console.log('👤 Obteniendo datos del usuario...');
        datosUsuario = await this.usuariosService.getDatosParaTemplate(userId);
        console.log('✅ Datos del usuario obtenidos:', {
          nombre: datosUsuario.sucursal_nombre,
          rfc: datosUsuario.empresa_rfc
        });
      } catch (error) {
        console.error('⚠️ Error al obtener datos del usuario:', error.message);
        // Continuar con valores por defecto si falla
      }
    } catch (error) {
      console.error('❌ Error al decodificar token:', error.message);
      throw new Error('Token inválido');
    }
  }

  try {
    const cotizacion = await this.findOne(id);
    console.log('✅ Cotización encontrada:', cotizacion.id);

    const templatesPath = path.join(process.cwd(), 'src', 'templates');
    const htmlPath = path.join(templatesPath, `${estilo}-quote.html`);

    console.log('📄 HTML path:', htmlPath);
    console.log('📂 Templates path:', templatesPath);
    console.log('📄 HTML exists?', fs.existsSync(htmlPath));
    
    try {
      const files = fs.readdirSync(templatesPath);
      console.log('📂 Archivos en templates:', files);
    } catch (err) {
      console.error('❌ Error leyendo directorio:', err);
    }

    if (!fs.existsSync(htmlPath)) {
      throw new NotFoundException(`Template HTML no encontrado en: ${htmlPath}`);
    }

    console.log('✅ Template HTML existe');

    const templateHtml = fs.readFileSync(htmlPath, 'utf8');

    // ⭐ Obtener logo del usuario desde biz-entities-api
    let logoDataUri: string;

    if (token && userId) {
      const logoUrl = await this.obtenerLogoUsuario(userId, token);
      
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

    // Obtener datos de la sucursal
    let sucursal = null;
    if (cotizacion.sucursalId) {
      try {
        console.log('🏢 Obteniendo sucursal con ID:', cotizacion.sucursalId);
        sucursal = await this.sucursalesService.findById(cotizacion.sucursalId.toString());
        console.log('✅ Sucursal encontrada:', sucursal?.alias || 'Sin alias');
      } catch (error) {
        console.error('⚠️ Error al obtener sucursal:', error.message);
      }
    } else {
      console.log('⚠️ La cotización no tiene sucursalId asignado');
    }

    // Generar HTML de items
    const itemsHtml = cotizacion.items.map(item => {
      const quantity = Number(item.cantidad);
      const unitPrice = Number(item.precioUnitario);
      const subtotal = Number(item.subtotal);
      
      return `
        <tr>
          <td>${quantity}</td>
          <td>${item.descripcion}</td>
          <td>$${unitPrice.toFixed(2)}</td>
          <td>$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Calcular totales
    const total = Number(cotizacion.total);
    const subtotal = Number(cotizacion.subtotal);
    const impuestos = Number(cotizacion.impuestos);

    // 👇 NUEVO: Preparar datos de la empresa/usuario
    const empresaNombre = datosUsuario?.sucursal_nombre || sucursal?.alias || 'Mi Empresa';
    const empresaRfc = datosUsuario?.empresa_rfc || 'XAXX010101000';
    const empresaTelefono = datosUsuario?.empresa_telefono || sucursal?.telefono || 'Sin teléfono';
    const empresaEmail = datosUsuario?.empresa_email || sucursal?.email || 'contacto@empresa.com';

    console.log('🏢 Datos de la empresa para el PDF:', {
      nombre: empresaNombre,
      rfc: empresaRfc,
      telefono: empresaTelefono,
      email: empresaEmail
    });

    // Reemplazar variables en el template
     let htmlFinal = templateHtml
      .replace('{{logo}}', logoDataUri)
      .replace(/\{\{tipo_documento\}\}/g, 'COTIZACIÓN')
      .replace(/\{\{fecha\}\}/g, (() => {
        const fecha = new Date(cotizacion.fechaCreacion);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = fecha.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
      })())
      .replace(/\{\{folio\}\}/g, cotizacion.folio.toString())
      .replace(/\{\{fecha_validez\}\}/g, (() => {
        if (!cotizacion.fechaValidez) return 'N/A';
        const fecha = new Date(cotizacion.fechaValidez);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = fecha.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
      })())
      .replace(/\{\{estado\}\}/g, cotizacion.estado || 'PENDIENTE')
      .replace(/\{\{cliente\}\}/g, cotizacion.clienteNombre || 'Cliente')
      .replace(/\{\{direccion\}\}/g, cotizacion.clienteDireccion || 'N/A')
      .replace(/\{\{telefono\}\}/g, cotizacion.clienteTelefono || 'N/A')
      .replace(/\{\{rfc\}\}/g, cotizacion.clienteRfc || 'N/A')
      .replace(/\{\{observaciones\}\}/g, cotizacion.observaciones || 'Sin observaciones')
      .replace(/\{\{items\}\}/g, itemsHtml)
      .replace(/\{\{subtotal\}\}/g, subtotal.toFixed(2))
      .replace(/\{\{impuestos\}\}/g, impuestos.toFixed(2))
      .replace(/\{\{total\}\}/g, total.toFixed(2))
      // 👇 NUEVO: Reemplazar datos de la empresa emisora
      .replace(/\{\{sucursal_nombre\}\}/g, empresaNombre)
      .replace(/\{\{empresa_nombre\}\}/g, empresaNombre)
      .replace(/\{\{empresa_rfc\}\}/g, empresaRfc)
      .replace(/\{\{sucursal_rfc\}\}/g, empresaRfc);

    // 👇 NUEVO: Preparar términos y condiciones
    const terminosCondiciones = datosUsuario?.terminos_condiciones_cotizacion || 
      `Esta cotización es válida hasta ${(() => {
        if (!cotizacion.fechaValidez) return 'N/A';
        const fecha = new Date(cotizacion.fechaValidez);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = fecha.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
      })()} Los precios están sujetos a cambio sin previo aviso. Para cualquier duda o aclaración, no dude en contactarnos.`;
    
    console.log('📋 Términos y condiciones:', terminosCondiciones.substring(0, 100) + '...');

    // Agregar el reemplazo de términos y condiciones
    htmlFinal = htmlFinal.replace(/\{\{terminos_condiciones\}\}/g, terminosCondiciones);

    // Reemplazar variables de la sucursal (dirección física)
    if (sucursal) {
      console.log('📝 Reemplazando variables de sucursal...');
      
      htmlFinal = htmlFinal
        .replace(/\{\{sucursal_direccion\}\}/g, sucursal.direccion || 'Sin dirección')
        .replace(/\{\{sucursal_calle\}\}/g, sucursal.direccion || 'Sin dirección')
        .replace(/\{\{sucursal_ciudad\}\}/g, sucursal.colonia || 'Sin colonia')
        .replace(/\{\{sucursal_estado\}\}/g, '')
        .replace(/\{\{sucursal_codigoPostal\}\}/g, sucursal.codigoPostal || 'Sin C.P.')
        .replace(/\{\{sucursal_telefono\}\}/g, empresaTelefono) // 👈 Usar dato del usuario si existe
        .replace(/\{\{sucursal_email\}\}/g, empresaEmail); // 👈 Usar dato del usuario si existe
      
      console.log('✅ Datos de sucursal reemplazados');
    } else {
      console.log('⚠️ No hay sucursal, usando valores del usuario o por defecto');
      htmlFinal = htmlFinal
        .replace(/\{\{sucursal_direccion\}\}/g, 'Dirección no disponible')
        .replace(/\{\{sucursal_calle\}\}/g, 'Dirección no disponible')
        .replace(/\{\{sucursal_ciudad\}\}/g, 'Ciudad')
        .replace(/\{\{sucursal_estado\}\}/g, 'Estado')
        .replace(/\{\{sucursal_codigoPostal\}\}/g, '00000')
        .replace(/\{\{sucursal_telefono\}\}/g, empresaTelefono) // 👈 Usar dato del usuario
        .replace(/\{\{sucursal_email\}\}/g, empresaEmail); // 👈 Usar dato del usuario
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

  async create(createDto: CreateCotizacionDto): Promise<Cotizacion> {
    this.logger.log(`Creando cotización para usuario: ${createDto.usuario_id}`);

    try {
      // 1. Generar folio
      const folio = await this.generateFolio();

      // 2. Crear cotización
      const cotizacion = this.cotizacionRepository.create({
        folio,
        usuarioId: createDto.usuario_id,
        clienteId: createDto.cliente_id,
        sucursalId: createDto.sucursal_id,
        fechaValidez: createDto.fecha_validez,
        clienteNombre: createDto.cliente_nombre,
        clienteRfc: createDto.cliente_rfc,
        clienteDireccion: createDto.cliente_direccion,
        clienteCiudad: createDto.cliente_ciudad,
        clienteTelefono: createDto.cliente_telefono,
        estado: createDto.estado || 'borrador',
        subtotal: createDto.subtotal,
        impuestos: createDto.impuestos,
        total: createDto.total,
        moneda: createDto.moneda,
        observaciones: createDto.observaciones,
        pdfGenerado: false,
        emailEnviado: false,
        // items se crean por separado según tu lógica
      });

      const savedCotizacion = await this.cotizacionRepository.save(cotizacion);

      // Guardar items (tu lógica existente)
      if (createDto.items && createDto.items.length > 0) {
        // await this.cotizacionItemRepository.save(items);
      }

      this.logger.log(`✓ Cotización creada con folio: ${savedCotizacion.folio}`);

      // 3. 🔥 Publicar jobs asíncronos
      try {
        // Job 1: Generar PDF
        await this.queueClient.generatePDF({
          entityId: savedCotizacion.id.toString(),
          entityType: 'cotizacion',
          template: 'cotizacion',
          userId: createDto.usuario_id.toString(),
          empresaId: createDto.usuario_id.toString()
        });

        this.logger.log('✓ Job de generación de PDF creado');

        // Job 2: Enviar email (si se solicita)
        if (createDto.enviarEmail && createDto.clienteEmail) {
          await this.queueClient.sendEmail({
            to: createDto.clienteEmail,
            subject: `Cotización ${savedCotizacion.folio}`,
            template: 'cotizacion',
            context: {
              folio: savedCotizacion.folio,
              cliente: savedCotizacion.clienteNombre,
              total: savedCotizacion.total,
              fechaValidez: savedCotizacion.fechaValidez
            },
            userId: createDto.usuario_id.toString(),
            empresaId: createDto.usuario_id.toString(),
            relatedEntityType: 'cotizacion',
            relatedEntityId: savedCotizacion.id.toString()
          }, {
            delay: 10000 // 10 segundos para que PDF esté listo
          });

          // Actualizar estado a 'enviada'
          await this.cotizacionRepository.update(savedCotizacion.id, {
            estado: 'enviada',
            emailEnviado: true,
            fechaEnvio: new Date()
          });

          this.logger.log('✓ Job de email creado');
        }

        // Job 3: Notificar
        await this.queueClient.sendNotification({
          userId: createDto.usuario_id.toString(),
          empresaId: createDto.usuario_id.toString(),
          type: 'info',
          title: 'Cotización Creada',
          message: `Cotización ${savedCotizacion.folio} creada exitosamente`,
          link: `/cotizaciones/${savedCotizacion.id}`,
          channels: ['websocket']
        });

      } catch (error) {
        this.logger.error(`Error en jobs asíncronos: ${error.message}`);
        // La cotización se creó pero los jobs fallaron
      }

      return savedCotizacion;

    } catch (error) {
      this.logger.error(`Error creando cotización: ${error.message}`, error.stack);
      throw error;
    }
  }
  // ========== NUEVO MÉTODO: Convertir a orden de venta ==========

  async convertToSalesOrder(cotizacionId: number, userId: string): Promise<any> {
    this.logger.log(`Convirtiendo cotización ${cotizacionId} a orden de venta`);

    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id: cotizacionId },
      relations: ['items']
    });

    if (!cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    if (cotizacion.estado === 'convertida') {
      throw new BadRequestException('Esta cotización ya fue convertida');
    }

    if (cotizacion.estado === 'rechazada') {
      throw new BadRequestException('No se puede convertir una cotización rechazada');
    }

    // Verificar vigencia
    const hoy = new Date();
    const fechaValidez = new Date(cotizacion.fechaValidez);
    
    if (fechaValidez < hoy) {
      await this.cotizacionRepository.update(cotizacionId, {
        estado: 'vencida'
      });
      throw new BadRequestException('Esta cotización ya venció');
    }

    // TODO: Aquí llamarías al SalesOrdersService.create()
    // Para este ejemplo, solo actualizamos el estado
    await this.cotizacionRepository.update(cotizacionId, {
      estado: 'convertida',
      fechaConversion: new Date()
    });

    return {
      success: true,
      message: 'Cotización convertida a orden de venta',
      cotizacionId
    };
  }

  async findAll(): Promise<Cotizacion[]> {
    return this.cotizacionRepository.find({
      relations: ['items'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async update(id: number, updateCotizacionDto: UpdateCotizacionDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    if (updateCotizacionDto.cliente_id !== undefined) cotizacion.clienteId = updateCotizacionDto.cliente_id;
    if (updateCotizacionDto.sucursal_id !== undefined) cotizacion.sucursalId = updateCotizacionDto.sucursal_id;
    
    // ✨ ACTUALIZAR CAMPOS DE CLIENTE
    if (updateCotizacionDto.cliente_nombre !== undefined) cotizacion.clienteNombre = updateCotizacionDto.cliente_nombre;
    if (updateCotizacionDto.cliente_rfc !== undefined) cotizacion.clienteRfc = updateCotizacionDto.cliente_rfc;
    if (updateCotizacionDto.cliente_direccion !== undefined) cotizacion.clienteDireccion = updateCotizacionDto.cliente_direccion;
    if (updateCotizacionDto.cliente_ciudad !== undefined) cotizacion.clienteCiudad = updateCotizacionDto.cliente_ciudad;
    if (updateCotizacionDto.cliente_telefono !== undefined) cotizacion.clienteTelefono = updateCotizacionDto.cliente_telefono;
    // FIN DE ACTUALIZACIÓN
    
    if (updateCotizacionDto.fecha_validez !== undefined) cotizacion.fechaValidez = updateCotizacionDto.fecha_validez;
    if (updateCotizacionDto.estado !== undefined) cotizacion.estado = updateCotizacionDto.estado;
    if (updateCotizacionDto.subtotal !== undefined) cotizacion.subtotal = updateCotizacionDto.subtotal;
    if (updateCotizacionDto.impuestos !== undefined) cotizacion.impuestos = updateCotizacionDto.impuestos;
    if (updateCotizacionDto.total !== undefined) cotizacion.total = updateCotizacionDto.total;
    if (updateCotizacionDto.moneda !== undefined) cotizacion.moneda = updateCotizacionDto.moneda;
    if (updateCotizacionDto.observaciones !== undefined) cotizacion.observaciones = updateCotizacionDto.observaciones;

    if (updateCotizacionDto.items) {
      await this.cotizacionItemRepository.delete({ cotizacionId: id });

      const itemsPromises = updateCotizacionDto.items.map(async (itemDto) => {
        const item = new CotizacionItem();
        item.cotizacionId = id;
        item.productoId = itemDto.producto_id;
        item.servicioId = itemDto.servicio_id;
        item.tipo = itemDto.tipo;
        item.descripcion = itemDto.descripcion;
        item.cantidad = itemDto.cantidad;
        item.precioUnitario = itemDto.precio_unitario;
        item.descuento = itemDto.descuento || 0;
        item.subtotal = itemDto.subtotal;
        item.impuestos = itemDto.impuestos;
        item.total = itemDto.total;
        item.impuestosSeleccionados = itemDto.impuestos_seleccionados;
        return this.cotizacionItemRepository.save(item);
      });

      await Promise.all(itemsPromises);
    }

    await this.cotizacionRepository.save(cotizacion);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.cotizacionItemRepository.delete({ cotizacionId: id });
    await this.cotizacionRepository.delete(id);
    this.logger.log(`🗑️ Cotización ${id} eliminada`);
  }

  async findBySucursal(sucursal_id: number): Promise<Cotizacion[]> {
    return this.cotizacionRepository.find({
      where: { sucursalId: sucursal_id },
      relations: ['items'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findWithoutSucursal(): Promise<Cotizacion[]> {
    return this.cotizacionRepository.find({
      where: { sucursalId: null },
      relations: ['items'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async sendQuotationByEmail(
    id: number,
    recipientEmail: string,
    customMessage: string,
    userId: string,
    pdfStyle: string = 'classic'
  ): Promise<any> {
    this.logger.log(`Enviando cotización ${id} por email a ${recipientEmail}`);

    try {
      const cotizacion = await this.findOne(id);

      if (!cotizacion) {
        throw new NotFoundException('Cotización no encontrada');
      }

      // Publicar job de email (el procesador generará el PDF si es necesario)
      await this.queueClient.sendEmail({
        to: recipientEmail,
        subject: `Cotización ${cotizacion.folio} - ${cotizacion.clienteNombre}`,
        template: 'cotizacion',
        context: {
          folio: cotizacion.folio,
          cliente: cotizacion.clienteNombre,
          total: cotizacion.total,
          fechaValidez: cotizacion.fechaValidez,
          customMessage: customMessage || 'Adjuntamos su cotización. Gracias por su preferencia.'
        },
        userId,
        empresaId: userId,
        relatedEntityType: 'cotizacion',
        relatedEntityId: id.toString()
      });

      // Actualizar estado
      if (cotizacion.estado === 'borrador') {
        await this.cotizacionRepository.update(id, {
          estado: 'enviada',
          emailEnviado: true,
          fechaEnvio: new Date()
        });
      } else {
        await this.cotizacionRepository.update(id, {
          emailEnviado: true,
          fechaEnvio: new Date()
        });
      }

      return {
        success: true,
        message: `Cotización enviada a ${recipientEmail}. Llegará en unos momentos.`
      };

    } catch (error) {
      this.logger.error(`Error enviando cotización por email: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== NUEVO MÉTODO: Reenviar email ==========

  async reenviarEmail(cotizacionId: number, userId: string): Promise<any> {
    const cotizacion = await this.findOne(cotizacionId);

    if (!cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // Obtener email del cliente (ajustar según tu lógica)
    const clienteEmail = 'cliente@example.com'; // TODO: Obtener del cliente

    await this.queueClient.sendEmail({
      to: clienteEmail,
      subject: `Cotización ${cotizacion.folio}`,
      template: 'cotizacion',
      context: {
        folio: cotizacion.folio,
        cliente: cotizacion.clienteNombre,
        total: cotizacion.total,
        fechaValidez: cotizacion.fechaValidez
      },
      userId,
      empresaId: userId,
      relatedEntityType: 'cotizacion',
      relatedEntityId: cotizacionId.toString()
    });

    return {
      success: true,
      message: 'Email reenviado. Llegará en unos momentos.'
    };
  }

  // ========== NUEVO MÉTODO: Regenerar PDF ==========

  async regenerarPDF(cotizacionId: number, userId: string): Promise<any> {
    const cotizacion = await this.findOne(cotizacionId);

    if (!cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    await this.queueClient.generatePDF({
      entityId: cotizacionId.toString(),
      entityType: 'cotizacion',
      template: 'cotizacion',
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
    const prefix = `COT-${currentYear}-`;

    const lastCotizacion = await this.cotizacionRepository
      .createQueryBuilder('cotizacion')
      .where('cotizacion.folio LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('cotizacion.folio', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastCotizacion?.folio) {
      const lastNumber = parseInt(lastCotizacion.folio.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
  }
}