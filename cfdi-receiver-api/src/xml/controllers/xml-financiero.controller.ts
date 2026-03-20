import { 
  Controller, 
  Post, 
  Get, 
  Query, 
  UseGuards, 
  Req, 
  Logger, 
  Param, 
  Res,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { XmlFinancieroService } from '../services/xml-financiero.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Response } from 'express';
@Controller('xml-financiero')
@UseGuards(JwtAuthGuard)
export class XmlFinancieroController {
  private readonly logger = new Logger(XmlFinancieroController.name);

  constructor(private readonly xmlFinancieroService: XmlFinancieroService) {}

  /**
   * Procesa todos los XMLs existentes para extraer datos financieros
   */
  @Post('procesar-todos')
  async procesarTodosLosXmls(@Req() req: any) {
    const usuarioId = req.user?.uid; // 🔹 Cambiado de 'id' a 'uid'
    
    this.logger.log(`📥 Procesando XMLs para usuario: ${usuarioId}`);
    
    const resultado = await this.xmlFinancieroService.procesarTodosLosXmls(usuarioId);
    
    this.logger.log(`✅ Procesamiento completado: ${resultado.exitosos} exitosos, ${resultado.errores} errores`);
    
    return {
      success: true,
      mensaje: 'Procesamiento financiero completado',
      resultado,
    };
  }

  /**
   * Obtiene estadísticas financieras generales
   */
  @Get('estadisticas')
  async obtenerEstadisticasFinancieras(@Req() req: any) {
    const usuarioId = req.user?.uid; // 🔹 Cambiado de 'id' a 'uid'
    
    this.logger.log(`📥 Obteniendo estadísticas para usuario: ${usuarioId}`);
    
    const estadisticas = await this.xmlFinancieroService.obtenerEstadisticasFinancieras(usuarioId);
    
    return {
      success: true,
      estadisticas,
    };
  }

  /**
   * Obtiene análisis financiero por período
   */
  @Get('analisis-periodo')
  async obtenerAnalisisPorPeriodo(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.uid; // 🔹 Cambiado de 'id' a 'uid'
    
    if (!fechaInicio || !fechaFin) {
      return {
        success: false,
        mensaje: 'Las fechas de inicio y fin son requeridas',
      };
    }

    this.logger.log(`📥 Análisis de período para usuario: ${usuarioId}, desde ${fechaInicio} hasta ${fechaFin}`);

    const analisis = await this.xmlFinancieroService.obtenerAnalisisPorPeriodo(
      usuarioId,
      new Date(fechaInicio),
      new Date(fechaFin),
    );
    
    return {
      success: true,
      analisis,
    };
  }

  /**
   * Obtiene resumen de IVA por período
   */
  @Get('resumen-iva')
  async obtenerResumenIva(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.uid; // 🔹 Cambiado de 'id' a 'uid'
    
    if (!fechaInicio || !fechaFin) {
      return {
        success: false,
        mensaje: 'Las fechas de inicio y fin son requeridas',
      };
    }

    const analisis = await this.xmlFinancieroService.obtenerAnalisisPorPeriodo(
      usuarioId,
      new Date(fechaInicio),
      new Date(fechaFin),
    );
    
    return {
      success: true,
      resumenIva: {
        ivaTrasladado: analisis.resumenPeriodo.total_iva_trasladado,
        ivaRetenido: analisis.resumenPeriodo.total_iva_retenido,
        ivaNeto: analisis.resumenPeriodo.total_iva_trasladado - analisis.resumenPeriodo.total_iva_retenido,
        totalIngresos: analisis.resumenPeriodo.total_ingresos,
        totalEgresos: analisis.resumenPeriodo.total_egresos,
      },
    };
  }

  /**
   * Obtiene top proveedores por período
   */
  @Get('top-proveedores')
  async obtenerTopProveedores(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('limite') limite: string = '10',
    @Req() req: any,
  ) {
    const usuarioId = req.user?.uid; // 🔹 Cambiado de 'id' a 'uid'
    
    if (!fechaInicio || !fechaFin) {
      return {
        success: false,
        mensaje: 'Las fechas de inicio y fin son requeridas',
      };
    }

    const analisis = await this.xmlFinancieroService.obtenerAnalisisPorPeriodo(
      usuarioId,
      new Date(fechaInicio),
      new Date(fechaFin),
    );
    
    return {
      success: true,
      topProveedores: analisis.topProveedores.slice(0, parseInt(limite)),
    };
  }
  /**
   * Obtiene CFDIs de INGRESO para el usuario
   * Regla: Emisor = Usuario O (Receptor = Usuario Y Tipo = Nómina)
   */
  @Get('ingresos')
  async getCfdisIngreso(
    @Query('rfcUsuario') rfcUsuario: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Req() req?: any
  ) {
    this.logger.debug('====== GET CFDIS INGRESO ======');
    this.logger.debug('RFC Usuario:', rfcUsuario);
    this.logger.debug('Usuario autenticado:', req.user?.uid);

    try {
      const cfdis = await this.xmlFinancieroService.getCfdisIngreso(
        rfcUsuario,
        fechaInicio,
        fechaFin
      );

      this.logger.debug(`✅ CFDIs de ingreso encontrados: ${cfdis.length}`);
      return cfdis;
    } catch (error) {
      this.logger.error('❌ Error obteniendo CFDIs de ingreso:', error);
      throw error;
    }
  }

  /**
   * Obtiene CFDIs de EGRESO para el usuario
   * Regla: Receptor = Usuario (excepto Nómina) O (Emisor = Usuario Y Tipo = Nómina)
   */
  @Get('egresos')
  async getCfdisEgreso(
    @Query('rfcUsuario') rfcUsuario: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Req() req?: any
  ) {
    this.logger.debug('====== GET CFDIS EGRESO ======');
    this.logger.debug('RFC Usuario:', rfcUsuario);
    this.logger.debug('Usuario autenticado:', req.user?.uid);

    try {
      const cfdis = await this.xmlFinancieroService.getCfdisEgreso(
        rfcUsuario,
        fechaInicio,
        fechaFin
      );

      this.logger.debug(`✅ CFDIs de egreso encontrados: ${cfdis.length}`);
      return cfdis;
    } catch (error) {
      this.logger.error('❌ Error obteniendo CFDIs de egreso:', error);
      throw error;
    }
  }
  /**
 * Obtiene análisis completo de ingresos
 */
@Get('ingresos/analisis-completo')
async getAnalisisCompletoIngresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('fechaInicio') fechaInicio: string,
  @Query('fechaFin') fechaFin: string,
  @Req() req?: any
) {
  this.logger.debug('====== GET ANÁLISIS COMPLETO INGRESOS ======');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Período:', fechaInicio, 'a', fechaFin);

  try {
    const analisis = await this.xmlFinancieroService.getAnalisisCompletoIngresos(
      rfcUsuario,
      fechaInicio,
      fechaFin
    );

    return {
      success: true,
      analisis
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo análisis completo:', error);
    throw error;
  }
}
/**
 * Obtiene análisis completo de egresos
 */
@Get('egresos/analisis-completo')
async getAnalisisCompletoEgresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('fechaInicio') fechaInicio: string,
  @Query('fechaFin') fechaFin: string,
  @Req() req?: any
) {
  this.logger.debug('====== GET ANÁLISIS COMPLETO EGRESOS ======');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Período:', fechaInicio, 'a', fechaFin);

  try {
    const analisis = await this.xmlFinancieroService.getAnalisisCompletoEgresos(
      rfcUsuario,
      fechaInicio,
      fechaFin
    );

    return {
      success: true,
      analisis
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo análisis completo de egresos:', error);
    throw error;
  }
}
// ====== ENDPOINTS DE BÚSQUEDA AVANZADA PARA EGRESOS ======

/**
 * Búsqueda rápida de CFDIs de egresos (autocomplete)
 */
@Get('egresos/buscar')
async buscarCfdisEgresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('query') query: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda rápida de egresos');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Query:', query);

  if (!query || query.length < 3) {
    return {
      success: false,
      mensaje: 'La búsqueda debe tener al menos 3 caracteres',
      cfdis: []
    };
  }

  try {
    return await this.xmlFinancieroService.buscarCfdisEgresos(rfcUsuario, query);
  } catch (error) {
    this.logger.error('❌ Error en búsqueda rápida de egresos:', error);
    throw error;
  }
}

/**
 * Búsqueda avanzada de CFDIs de egresos con filtros
 */
@Get('egresos/busqueda-avanzada')
async busquedaAvanzadaEgresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('rfc') rfc?: string,
  @Query('nombre') nombre?: string,
  @Query('uuid') uuid?: string,
  @Query('folio') folio?: string,
  @Query('serie') serie?: string,
  @Query('fechaInicio') fechaInicio?: string,
  @Query('fechaFin') fechaFin?: string,
  @Query('montoMin') montoMin?: string,
  @Query('montoMax') montoMax?: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda avanzada de egresos');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Filtros:', { rfc, nombre, uuid, folio, serie, fechaInicio, fechaFin, montoMin, montoMax });

  try {
    const filtros: any = {};
    
    if (rfc) filtros.rfc = rfc;
    if (nombre) filtros.nombre = nombre;
    if (uuid) filtros.uuid = uuid;
    if (folio) filtros.folio = folio;
    if (serie) filtros.serie = serie;
    if (fechaInicio) filtros.fechaInicio = fechaInicio;
    if (fechaFin) filtros.fechaFin = fechaFin;
    if (montoMin) filtros.montoMin = parseFloat(montoMin);
    if (montoMax) filtros.montoMax = parseFloat(montoMax);

    return await this.xmlFinancieroService.busquedaAvanzadaEgresos(rfcUsuario, filtros);
  } catch (error) {
    this.logger.error('❌ Error en búsqueda avanzada de egresos:', error);
    throw error;
  }
}

// ====== ENDPOINTS DE BÚSQUEDA AVANZADA PARA INGRESOS ======

/**
 * Búsqueda rápida de CFDIs de ingresos (autocomplete)
 */
@Get('ingresos/buscar')
async buscarCfdisIngresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('query') query: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda rápida de ingresos');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Query:', query);

  if (!query || query.length < 3) {
    return {
      success: false,
      mensaje: 'La búsqueda debe tener al menos 3 caracteres',
      cfdis: []
    };
  }

  try {
    return await this.xmlFinancieroService.buscarCfdisIngresos(rfcUsuario, { query });
  } catch (error) {
    this.logger.error('❌ Error en búsqueda rápida de ingresos:', error);
    throw error;
  }
}

/**
 * Búsqueda avanzada de CFDIs de ingresos con filtros
 */
@Get('ingresos/busqueda-avanzada')
async busquedaAvanzadaIngresos(
  @Query('rfcUsuario') rfcUsuario: string,
  @Query('rfc') rfc?: string,
  @Query('nombre') nombre?: string,
  @Query('uuid') uuid?: string,
  @Query('folio') folio?: string,
  @Query('serie') serie?: string,
  @Query('fechaInicio') fechaInicio?: string,
  @Query('fechaFin') fechaFin?: string,
  @Query('montoMin') montoMin?: string,
  @Query('montoMax') montoMax?: string,
  @Query('metodoPago') metodoPago?: string,
  @Query('formaPago') formaPago?: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda avanzada de ingresos');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Filtros:', { rfc, nombre, uuid, folio, serie, fechaInicio, fechaFin, montoMin, montoMax, metodoPago, formaPago });

  try {
    const filtros: any = {};
    
    if (rfc) filtros.rfc = rfc;
    if (nombre) filtros.nombre = nombre;
    if (uuid) filtros.uuid = uuid;
    if (folio) filtros.folio = folio;
    if (serie) filtros.serie = serie;
    if (fechaInicio) filtros.fechaInicio = fechaInicio;
    if (fechaFin) filtros.fechaFin = fechaFin;
    if (montoMin) filtros.montoMin = parseFloat(montoMin);
    if (montoMax) filtros.montoMax = parseFloat(montoMax);
    if (metodoPago) filtros.metodoPago = metodoPago;
    if (formaPago) filtros.formaPago = formaPago;

    return await this.xmlFinancieroService.busquedaAvanzadaIngresos(rfcUsuario, filtros);
  } catch (error) {
    this.logger.error('❌ Error en búsqueda avanzada de ingresos:', error);
    throw error;
  }
}
/**
 * Búsqueda rápida de CFDIs de EGRESO
 */
@Get('cfdis/egresos/busqueda-rapida')
async busquedaRapidaEgresos(
  @Query('query') query: string,
  @Query('fechaInicio') fechaInicio?: string,
  @Query('fechaFin') fechaFin?: string,
  @Query('montoMin') montoMin?: number,
  @Query('montoMax') montoMax?: number,
  @Query('tipoComprobante') tipoComprobante?: string,
  @Query('offset') offset?: number,
  @Query('limit') limit?: number,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda rápida de egresos');
  this.logger.debug('Query:', query);

  // ✅ Obtener el RFC del usuario autenticado
  const rfcUsuario = req.user?.rfc;
  
  if (!rfcUsuario) {
    throw new Error('RFC de usuario no encontrado en el token');
  }

  this.logger.debug('✅ RFC Usuario:', rfcUsuario);

  const filtros = {
    query,
    fechaInicio,
    fechaFin,
    montoMin,
    montoMax,
    tipoComprobante,
    offset: offset ? Number(offset) : 0,
    limit: limit ? Number(limit) : 50
  };

  return this.xmlFinancieroService.buscarCfdisEgresos(rfcUsuario, filtros);
}

/**
 * Búsqueda rápida de CFDIs de INGRESO
 */
@Get('cfdis/ingresos/busqueda-rapida')
async busquedaRapidaIngresos(
  @Query('query') query: string,
  @Query('fechaInicio') fechaInicio?: string,
  @Query('fechaFin') fechaFin?: string,
  @Query('montoMin') montoMin?: number,
  @Query('montoMax') montoMax?: number,
  @Query('tipoComprobante') tipoComprobante?: string,
  @Query('metodoPago') metodoPago?: string,
  @Query('formaPago') formaPago?: string,
  @Query('rfcReceptor') rfcReceptor?: string,
  @Query('offset') offset?: number,
  @Query('limit') limit?: number,
  @Req() req?: any
) {
  this.logger.debug('🔍 Búsqueda rápida de ingresos');

  const rfcUsuario = req.user?.rfc;

  if (!rfcUsuario) {
    throw new Error('RFC de usuario no encontrado en el token');
  }

  this.logger.debug('✅ RFC Usuario:', rfcUsuario);
  this.logger.debug('📌 Filtros recibidos:', {
    query,
    fechaInicio,
    fechaFin,
    montoMin,
    montoMax,
    tipoComprobante,
    metodoPago,
    formaPago,
    rfcReceptor,
    offset,
    limit
  });

  const filtros = {
    query,
    fechaInicio,
    fechaFin,
    montoMin: montoMin !== undefined ? Number(montoMin) : undefined,
    montoMax: montoMax !== undefined ? Number(montoMax) : undefined,
    tipoComprobante,
    metodoPago,
    formaPago,
    rfcReceptor,
    offset: offset ? Number(offset) : 0,
    limit: limit ? Number(limit) : 50
  };

  return this.xmlFinancieroService.buscarCfdisIngresos(rfcUsuario, filtros);
}

// ====== ENDPOINTS DE DETALLES DE CFDI ======

/**
 * Obtiene los detalles completos de un CFDI por UUID
 */
@Get('cfdis/:uuid')
async getDetallesCfdi(
  @Param('uuid') uuid: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Obteniendo detalles de CFDI:', uuid);

  try {
    return await this.xmlFinancieroService.getDetallesCfdi(uuid);
  } catch (error) {
    this.logger.error('❌ Error obteniendo detalles:', error);
    throw error;
  }
}

/**
 * Obtiene los impuestos de un CFDI
 */
@Get('cfdis/:uuid/impuestos')
async getImpuestosCfdi(
  @Param('uuid') uuid: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Obteniendo impuestos de CFDI:', uuid);

  try {
    return await this.xmlFinancieroService.getImpuestosCfdi(uuid);
  } catch (error) {
    this.logger.error('❌ Error obteniendo impuestos:', error);
    throw error;
  }
}

/**
 * Obtiene las retenciones de un CFDI
 */
@Get('cfdis/:uuid/retenciones')
async getRetencionesCfdi(
  @Param('uuid') uuid: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Obteniendo retenciones de CFDI:', uuid);

  try {
    return await this.xmlFinancieroService.getRetencionesCfdi(uuid);
  } catch (error) {
    this.logger.error('❌ Error obteniendo retenciones:', error);
    throw error;
  }
}

/**
 * Obtiene las partidas/conceptos de un CFDI
 */
@Get('cfdis/:uuid/partidas')
async getPartidasCfdi(
  @Param('uuid') uuid: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Obteniendo partidas de CFDI:', uuid);

  try {
    return await this.xmlFinancieroService.getPartidasCfdi(uuid);
  } catch (error) {
    this.logger.error('❌ Error obteniendo partidas:', error);
    throw error;
  }
}

/**
 * Obtiene los pagos relacionados de un CFDI (para PPD)
 */
@Get('cfdis/:uuid/pagos')
async getPagosCfdi(
  @Param('uuid') uuid: string,
  @Req() req?: any
) {
  this.logger.debug('🔍 Obteniendo pagos de CFDI:', uuid);

  try {
    return await this.xmlFinancieroService.getPagosCfdi(uuid);
  } catch (error) {
    this.logger.error('❌ Error obteniendo pagos:', error);
    throw error;
  }
}

/**
   * Descarga el XML de un CFDI
   */
  @Get('cfdis/:uuid/xml')
  async descargarXml(
    @Param('uuid') uuid: string,
    @Res() res: Response
  ) {
    this.logger.debug('📥 Endpoint descargarXml llamado');
    this.logger.debug('📥 UUID recibido:', uuid);

    try {
      const result = await this.xmlFinancieroService.descargarXml(uuid);

      if (!result.success || !result.xml) {
        this.logger.error('❌ XML no encontrado en resultado');
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'XML no encontrado'
        });
      }

      this.logger.debug('✅ XML encontrado, enviando respuesta');

      // Establecer headers para descarga
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      // Enviar el XML
      return res.send(result.xml);

    } catch (error) {
      this.logger.error('❌ Error en descargarXml:', error.message);
      this.logger.error('❌ Stack:', error.stack);
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Error al descargar el XML'
      });
    }
  }
  /**
 * Descarga el PDF de un CFDI
 */
@Get('cfdis/:uuid/pdf')
async descargarPdf(
  @Param('uuid') uuid: string,
  @Query('style') estilo: string = 'classic',  // Permitir elegir estilo
  @Res() res: Response
) {
  this.logger.debug('📥 Generando PDF:', uuid);
  this.logger.debug('🎨 Estilo:', estilo);

  try {
    const result = await this.xmlFinancieroService.descargarPdf(uuid, estilo);

    if (!result.success || !result.pdf) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'No se pudo generar el PDF'
      });
    }

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.pdf.length);
    
    return res.send(result.pdf);

  } catch (error) {
    this.logger.error('❌ Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al generar el PDF'
    });
  }
}
}
