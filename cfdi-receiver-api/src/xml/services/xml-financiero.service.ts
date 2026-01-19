import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XmlRecibido } from '../entities/xml-recibido.entity';
import { XmlFinanciero } from '../entities/xml-financiero.entity';
import { XmlParserService, ParsedXmlData } from './xml-parser.service';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import * as puppeteer from 'puppeteer';

export interface ProcessingResult {
  totalProcesados: number;
  exitosos: number;
  errores: number;
  detalleErrores: string[];
  yaExistentes: number;
}

@Injectable()
export class XmlFinancieroService {
  private readonly logger = new Logger(XmlFinancieroService.name);

  constructor(
    @InjectRepository(XmlRecibido)
    private xmlRecibidoRepository: Repository<XmlRecibido>,
    
    @InjectRepository(XmlFinanciero)
    private xmlFinancieroRepository: Repository<XmlFinanciero>,
    
    private xmlParserService: XmlParserService,
  ) {}

  /**
   * Procesa todos los XMLs existentes para extraer datos financieros
   */
  async procesarTodosLosXmls(usuarioId?: string): Promise<ProcessingResult> {  // 🔹 Cambiado de number a string
    this.logger.log('Iniciando procesamiento de datos financieros...');
    this.logger.log(`Usuario ID: ${usuarioId}`);
    
    const resultado: ProcessingResult = {
      totalProcesados: 0,
      exitosos: 0,
      errores: 0,
      detalleErrores: [],
      yaExistentes: 0,
    };

    try {
      // Obtener XMLs que no han sido procesados
      const queryBuilder = this.xmlRecibidoRepository
        .createQueryBuilder('xml')
        .leftJoin('xmls_financieros', 'xf', 'xf.xml_recibido_id = xml.id')
        .where('xf.id IS NULL'); // Solo los que no tienen datos financieros

      if (usuarioId) {
        queryBuilder.andWhere('xml.usuario_id = :usuarioId', { usuarioId });
      }

      const xmlsPendientes = await queryBuilder.getMany();
      
      this.logger.log(`Encontrados ${xmlsPendientes.length} XMLs pendientes de procesar`);

      for (const xmlRecord of xmlsPendientes) {
        resultado.totalProcesados++;
        
        try {
          await this.procesarXmlIndividual(xmlRecord);
          resultado.exitosos++;
          
          if (resultado.exitosos % 50 === 0) {
            this.logger.log(`Procesados ${resultado.exitosos} XMLs...`);
          }
          
        } catch (error) {
          resultado.errores++;
          const mensaje = `Error procesando XML ID ${xmlRecord.id}: ${error.message}`;
          resultado.detalleErrores.push(mensaje);
          this.logger.error(mensaje);
        }
      }

      this.logger.log(`Procesamiento completado. Exitosos: ${resultado.exitosos}, Errores: ${resultado.errores}`);
      return resultado;

    } catch (error) {
      this.logger.error(`Error en procesamiento masivo: ${error.message}`);
      resultado.detalleErrores.push(`Error general: ${error.message}`);
      return resultado;
    }
  }

  /**
   * Procesa un XML individual para extraer datos financieros
   */
  async procesarXmlIndividual(xmlRecord: XmlRecibido): Promise<XmlFinanciero> {
    try {
      // Parsear XML
      const datosFinancieros = await this.xmlParserService.parseXmlContent(xmlRecord.xml_completo);
      
      // Crear registro financiero
      const xmlFinanciero = this.xmlFinancieroRepository.create({
        xml_recibido_id: xmlRecord.id,
        usuario_id: xmlRecord.usuario_id,
        
        // Datos básicos
        folio: datosFinancieros.folio,
        serie: datosFinancieros.serie,
        fecha: datosFinancieros.fecha,
        folio_fiscal: datosFinancieros.folioFiscal,
        
        // Datos financieros
        moneda: datosFinancieros.moneda,
        tipo_cambio: datosFinancieros.tipoCambio,
        sub_total: datosFinancieros.subTotal,
        descuento: datosFinancieros.descuento,
        total: datosFinancieros.total,
        
        // Datos de pago
        forma_pago: datosFinancieros.formaPago,
        metodo_pago: datosFinancieros.metodoPago,
        condiciones_pago: datosFinancieros.condicionesPago,
        
        // Datos del emisor
        rfc_emisor: datosFinancieros.rfcEmisor,
        nombre_emisor: datosFinancieros.nombreEmisor,
        regimen_fiscal_emisor: datosFinancieros.regimenFiscalEmisor,
        
        // Datos del receptor
        rfc_receptor: datosFinancieros.rfcReceptor,
        nombre_receptor: datosFinancieros.nombreReceptor,
        uso_cfdi: datosFinancieros.usoCfdi,
        
        // Impuestos
        total_impuestos_trasladados: datosFinancieros.totalImpuestosTrasladados || 0,
        total_impuestos_retenidos: datosFinancieros.totalImpuestosRetenidos || 0,
        iva_trasladado: datosFinancieros.ivaTrasladado || 0,
        iva_retenido: datosFinancieros.ivaRetenido || 0,
        isr_retenido: datosFinancieros.isrRetenido || 0,
        ieps_retenido: datosFinancieros.iepsRetenido || 0,
        
        // Metadatos
        version: datosFinancieros.version,
        tipo_comprobante: datosFinancieros.tipoComprobante,
        lugar_expedicion: datosFinancieros.lugarExpedicion,
        
        // Conceptos como JSON
        conceptos_detalle: datosFinancieros.conceptos,
        
        estado_procesamiento: 'PROCESADO',
      });

      return await this.xmlFinancieroRepository.save(xmlFinanciero);

    } catch (error) {
      this.logger.error(`Error procesando XML individual: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas financieras básicas
   */
  async obtenerEstadisticasFinancieras(usuarioId: string) {  // 🔹 Cambiado de number a string
    try {
      const stats = await this.xmlFinancieroRepository
        .createQueryBuilder('xf')
        .select([
          'COUNT(*) as total_documentos',
          'SUM(xf.total) as total_general',
          'SUM(xf.iva_trasladado) as total_iva_trasladado',
          'SUM(xf.iva_retenido) as total_iva_retenido',
          'COUNT(CASE WHEN xf.tipo_comprobante = \'I\' THEN 1 END) as ingresos',
          'COUNT(CASE WHEN xf.tipo_comprobante = \'E\' THEN 1 END) as egresos',
          'COUNT(CASE WHEN xf.tipo_comprobante = \'N\' THEN 1 END) as nominas',
        ])
        .where('xf.usuario_id = :usuarioId', { usuarioId })
        .getRawOne();

      const porTipoComprobante = await this.xmlFinancieroRepository
        .createQueryBuilder('xf')
        .select([
          'xf.tipo_comprobante as tipo',
          'COUNT(*) as cantidad',
          'SUM(xf.total) as total',
        ])
        .where('xf.usuario_id = :usuarioId', { usuarioId })
        .groupBy('xf.tipo_comprobante')
        .getRawMany();

      return {
        resumenGeneral: stats,
        porTipoComprobante,
      };

    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene análisis financiero por período
   */
  async obtenerAnalisisPorPeriodo(
    usuarioId: string,  // 🔹 Cambiado de number a string
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    try {
      const resumen = await this.xmlFinancieroRepository
        .createQueryBuilder('xf')
        .select([
          'SUM(CASE WHEN xf.tipo_comprobante = \'I\' THEN xf.total ELSE 0 END) as total_ingresos',
          'SUM(CASE WHEN xf.tipo_comprobante = \'E\' THEN xf.total ELSE 0 END) as total_egresos',
          'SUM(xf.iva_trasladado) as total_iva_trasladado',
          'SUM(xf.iva_retenido) as total_iva_retenido',
          'COUNT(*) as total_documentos',
        ])
        .where('xf.usuario_id = :usuarioId', { usuarioId })
        .andWhere('xf.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin })
        .getRawOne();

      const topProveedores = await this.xmlFinancieroRepository
        .createQueryBuilder('xf')
        .select([
          'xf.rfc_emisor as rfc',
          'xf.nombre_emisor as nombre',
          'COUNT(*) as cantidad_facturas',
          'SUM(xf.total) as total_gastado',
        ])
        .where('xf.usuario_id = :usuarioId', { usuarioId })
        .andWhere('xf.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin })
        .andWhere('xf.tipo_comprobante = :tipo', { tipo: 'I' })
        .groupBy('xf.rfc_emisor, xf.nombre_emisor')
        .orderBy('SUM(xf.total)', 'DESC')
        .limit(10)
        .getRawMany();

      return {
        resumenPeriodo: resumen,
        topProveedores,
      };

    } catch (error) {
      this.logger.error(`Error en análisis por período: ${error.message}`);
      throw error;
    }
  }
  /**
 * INGRESOS: Donde Mario RECIBE dinero
 * 
 * DEBE INCLUIR:
 * 1. Facturas donde Mario es EMISOR (ventas)
 * 2. Nóminas donde Mario es RECEPTOR (él recibe sueldo del ISSSTE)
 */
async getCfdisIngreso(rfcUsuario: string, fechaInicio: string, fechaFin: string): Promise<any[]> {
  this.logger.log('====== OBTENIENDO CFDIS DE INGRESO ======');
  this.logger.log(`RFC Usuario: ${rfcUsuario}`);
  this.logger.log(`Período: ${fechaInicio} a ${fechaFin}`);

  const query = `
    SELECT *
    FROM xmls_financieros
    WHERE (
      -- CASO 1: Usuario es EMISOR de facturas (ventas)
      (
        rfc_emisor = $1
        AND tipo_comprobante != 'N'
      )
      
      OR
      
      -- CASO 2: Usuario es RECEPTOR de nóminas (recibe sueldo)
      (
        rfc_receptor = $1
        AND tipo_comprobante = 'N'
      )
    )
    
    -- Período
    AND fecha BETWEEN $2 AND $3
    
    -- Excluir cancelados
    AND estado_procesamiento != 'CANCELADO'
    
    ORDER BY fecha DESC
  `;

  try {
    const result = await this.xmlFinancieroRepository.query(query, [
      rfcUsuario,
      fechaInicio,
      fechaFin
    ]);

    this.logger.log(`✅ CFDIs de ingreso encontrados: ${result.length}`);
    
    // Log detallado
    const ventas = result.filter(r => r.tipo_comprobante === 'I');
    const nominasRecibidas = result.filter(r => r.tipo_comprobante === 'N');
    
    this.logger.log(`   📊 Distribución por tipo:`);
    this.logger.log(`      - Ingresos (Ventas) (I): ${ventas.length}`);
    this.logger.log(`      - Nóminas (N): ${nominasRecibidas.length}`);
    
    if (nominasRecibidas.length > 0) {
      this.logger.log(`   💰 Nóminas recibidas (usuario como EMPLEADO): ${nominasRecibidas.length}`);
      nominasRecibidas.slice(0, 5).forEach(n => {
        this.logger.log(`      - De: ${n.nombre_emisor} (${n.rfc_emisor}) - $${n.total}`);
      });
    }
    
    const total = result.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    this.logger.log(`   💵 Total ingresos: $${total.toFixed(2)}`);
    
    return result;
  } catch (error) {
    this.logger.error('❌ Error obteniendo CFDIs de ingreso:', error);
    throw error;
  }
}

/**
 * EGRESOS: Donde Mario PAGA dinero
 * 
 * DEBE INCLUIR:
 * 1. Facturas donde Mario es RECEPTOR (compras)
 * 2. Nóminas donde Mario es EMISOR (él paga sueldos a Sandra/Angelica)
 */
async getCfdisEgreso(rfcUsuario: string, fechaInicio: string, fechaFin: string): Promise<any[]> {
  this.logger.log('====== OBTENIENDO CFDIS DE EGRESO ======');
  this.logger.log(`RFC Usuario: ${rfcUsuario}`);
  this.logger.log(`Período: ${fechaInicio} a ${fechaFin}`);

  const query = `
    SELECT *
    FROM xmls_financieros
    WHERE (
      -- CASO 1: Usuario es RECEPTOR de facturas (compras)
      (
        rfc_receptor = $1
        AND tipo_comprobante IN ('E', 'P')
      )
      
      OR
      
      -- CASO 2: Usuario es EMISOR de nóminas (paga sueldos)
      (
        rfc_emisor = $1
        AND tipo_comprobante = 'N'
      )
    )
    
    -- Período
    AND fecha BETWEEN $2 AND $3
    
    -- Excluir cancelados
    AND estado_procesamiento != 'CANCELADO'
    
    ORDER BY fecha DESC
  `;

  try {
    const result = await this.xmlFinancieroRepository.query(query, [
      rfcUsuario,
      fechaInicio,
      fechaFin
    ]);

    this.logger.log(`✅ CFDIs de egreso encontrados: ${result.length}`);
    
    // Log detallado
    const compras = result.filter(c => c.tipo_comprobante === 'E');
    const pagos = result.filter(c => c.tipo_comprobante === 'P');
    const nominasPagadas = result.filter(c => c.tipo_comprobante === 'N');
    
    this.logger.log(`   📊 Distribución:`);
    this.logger.log(`      - Egresos (E): ${compras.length}`);
    this.logger.log(`      - Pagos (P): ${pagos.length}`);
    this.logger.log(`      - Nóminas (N): ${nominasPagadas.length}`);
    
    if (nominasPagadas.length > 0) {
      this.logger.log(`   💸 Nóminas pagadas (usuario como PATRÓN): ${nominasPagadas.length}`);
      nominasPagadas.slice(0, 5).forEach(n => {
        this.logger.log(`      - A: ${n.nombre_receptor} (${n.rfc_receptor}) - $${n.total}`);
      });
    }
    
    const total = result.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    this.logger.log(`   💸 Total egresos: $${total.toFixed(2)}`);
    
    return result;
  } catch (error) {
    this.logger.error('❌ Error obteniendo CFDIs de egreso:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de ingresos
 */
async getEstadisticasIngresos(
  rfcUsuario: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<any> {
  this.logger.debug('📊 Obteniendo estadísticas de ingresos');

  try {
    const query = this.xmlFinancieroRepository
      .createQueryBuilder('cfdi')
      .where('cfdi.rfc_emisor = :rfc', { rfc: rfcUsuario })
      .andWhere('cfdi.tipo_comprobante = :tipo', { tipo: 'I' });

    if (fechaInicio && fechaFin) {
      query.andWhere('cfdi.fecha BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio,
        fechaFin
      });
    }

    const cfdis = await query.getMany();

    // Calcular totales
    const totalGeneral = cfdis.reduce((sum, cfdi) => sum + Number(cfdi.total || 0), 0);
    const subtotal = cfdis.reduce((sum, cfdi) => sum + Number(cfdi.sub_total || 0), 0);
    const ivaTotal = cfdis.reduce((sum, cfdi) => sum + Number(cfdi.iva_trasladado || 0), 0);

    return {
      totalGeneral,
      subtotal,
      ivaTotal,
      cantidadTotal: cfdis.length,
      promedioVenta: cfdis.length > 0 ? totalGeneral / cfdis.length : 0
    };

  } catch (error) {
    this.logger.error('❌ Error obteniendo estadísticas de ingresos:', error.message);
    throw error;
  }
}

/**
 * Obtiene estadísticas de egresos
 */
async getEstadisticasEgresos(
  rfcUsuario: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<any> {
  this.logger.debug('📊 Obteniendo estadísticas de egresos');

  try {
    const query = this.xmlFinancieroRepository
      .createQueryBuilder('cfdi')
      .where(
        // ✅ Misma lógica corregida
        '(' +
        '(cfdi.tipo_comprobante = :tipoNomina AND cfdi.rfc_emisor = :rfc) OR ' +
        '(cfdi.tipo_comprobante IN (:...otrosTipos) AND cfdi.rfc_receptor = :rfc)' +
        ')',
        { 
          tipoNomina: 'N',
          otrosTipos: ['E', 'P'],
          rfc: rfcUsuario 
        }
      );

    if (fechaInicio && fechaFin) {
      query.andWhere('cfdi.fecha BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio,
        fechaFin
      });
    }

    const cfdis = await query.getMany();

    // Calcular totales por tipo
    const totalGeneral = cfdis.reduce((sum, cfdi) => sum + Number(cfdi.total || 0), 0);
    
    const totalEgresos = cfdis
      .filter(c => c.tipo_comprobante === 'E')
      .reduce((sum, cfdi) => sum + Number(cfdi.total || 0), 0);
    
    const totalNominas = cfdis
      .filter(c => c.tipo_comprobante === 'N')
      .reduce((sum, cfdi) => sum + Number(cfdi.total || 0), 0);
    
    const totalPagos = cfdis
      .filter(c => c.tipo_comprobante === 'P')
      .reduce((sum, cfdi) => sum + Number(cfdi.total || 0), 0);

    return {
      totalGeneral,
      totalEgresos,
      totalNominas,
      totalPagos,
      cantidadTotal: cfdis.length,
      cantidadEgresos: cfdis.filter(c => c.tipo_comprobante === 'E').length,
      cantidadNominas: cfdis.filter(c => c.tipo_comprobante === 'N').length,
      cantidadPagos: cfdis.filter(c => c.tipo_comprobante === 'P').length
    };

  } catch (error) {
    this.logger.error('❌ Error obteniendo estadísticas:', error.message);
    throw error;
  }
}
/**
 * Obtiene análisis completo de ingresos para el usuario
 */
async getAnalisisCompletoIngresos(
  rfcUsuario: string,
  fechaInicio: string,
  fechaFin: string
): Promise<any> {
  this.logger.log('====== ANÁLISIS COMPLETO DE INGRESOS ======');
  this.logger.log(`RFC Usuario: ${rfcUsuario}`);
  this.logger.log(`Período: ${fechaInicio} a ${fechaFin}`);

  try {
    // Obtener todos los CFDIs de ingreso
    const cfdis = await this.getCfdisIngreso(rfcUsuario, fechaInicio, fechaFin);

    // 1. RESUMEN GENERAL
    const resumenGeneral = await this.calcularResumenGeneral(cfdis);

    // 2. TOP CLIENTES POR MONTO
    const topClientesPorMonto = await this.calcularTopClientesPorMonto(cfdis, 5);

    // 3. TOP CLIENTES POR CANTIDAD
    const topClientesPorCantidad = await this.calcularTopClientesPorCantidad(cfdis, 5);

    // 4. ANÁLISIS TEMPORAL (por mes)
    const analisisTemporal = await this.calcularAnalisisTemporal(cfdis);

    // 5. ANÁLISIS POR FORMA DE PAGO
    const porFormaPago = await this.agruparPorFormaPago(cfdis);

    // 6. ANÁLISIS POR MÉTODO DE PAGO
    const porMetodoPago = await this.agruparPorMetodoPago(cfdis);

    // 7. ANÁLISIS POR USO DE CFDI
    const porUsoCfdi = await this.agruparPorUsoCfdi(cfdis);

    // 8. RETENCIONES
    const retenciones = await this.calcularRetenciones(cfdis);

    // 9. CLIENTES INACTIVOS
    const clientesInactivos = await this.obtenerClientesInactivos(
      rfcUsuario,
      fechaFin,
      30 // días sin facturar
    );

    return {
      resumenGeneral,
      topClientesPorMonto,
      topClientesPorCantidad,
      analisisTemporal,
      porFormaPago,
      porMetodoPago,
      porUsoCfdi,
      retenciones,
      clientesInactivos,
      totalCfdis: cfdis.length
    };
  } catch (error) {
    this.logger.error('Error en análisis completo de ingresos:', error);
    throw error;
  }
}

/**
 * Calcula resumen general de ingresos
 */
private async calcularResumenGeneral(cfdis: any[]): Promise<any> {
  const totalCfdis = cfdis.length;
  const cfdisCancelados = cfdis.filter(c => c.estado_procesamiento === 'CANCELADO').length;
  const cfdisVigentes = totalCfdis - cfdisCancelados;

  const subtotal = cfdis.reduce((sum, c) => sum + (parseFloat(c.sub_total) || 0), 0);
  const ivaTotal = cfdis.reduce((sum, c) => sum + (parseFloat(c.iva_trasladado) || 0), 0);
  const total = cfdis.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
  
  const montoCancelados = cfdis
    .filter(c => c.estado_procesamiento === 'CANCELADO')
    .reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

  const promedioIngreso = cfdisVigentes > 0 ? total / cfdisVigentes : 0;
  const porcentajeVigentes = totalCfdis > 0 ? (cfdisVigentes / totalCfdis) * 100 : 0;

  return {
    totalCfdis,
    cfdisVigentes,
    cfdisCancelados,
    subtotal: parseFloat(subtotal.toFixed(2)),
    ivaTotal: parseFloat(ivaTotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    montoCancelados: parseFloat(montoCancelados.toFixed(2)),
    promedioIngreso: parseFloat(promedioIngreso.toFixed(2)),
    porcentajeVigentes: parseFloat(porcentajeVigentes.toFixed(2))
  };
}

/**
 * Calcula top clientes por monto
 */
private async calcularTopClientesPorMonto(cfdis: any[], top: number = 5): Promise<any[]> {
  const clientesMap = new Map();

  cfdis.forEach(cfdi => {
    const rfcCliente = cfdi.rfc_receptor;
    const nombreCliente = cfdi.nombre_receptor || rfcCliente;
    const monto = parseFloat(cfdi.total) || 0;

    if (!clientesMap.has(rfcCliente)) {
      clientesMap.set(rfcCliente, {
        rfc: rfcCliente,
        nombre: nombreCliente,
        totalMonto: 0,
        cantidad: 0
      });
    }

    const cliente = clientesMap.get(rfcCliente);
    cliente.totalMonto += monto;
    cliente.cantidad += 1;
  });

  return Array.from(clientesMap.values())
    .sort((a, b) => b.totalMonto - a.totalMonto)
    .slice(0, top)
    .map(c => ({
      ...c,
      totalMonto: parseFloat(c.totalMonto.toFixed(2))
    }));
}

/**
 * Calcula top clientes por cantidad de CFDIs
 */
private async calcularTopClientesPorCantidad(cfdis: any[], top: number = 5): Promise<any[]> {
  const clientesMap = new Map();

  cfdis.forEach(cfdi => {
    const rfcCliente = cfdi.rfc_receptor;
    const nombreCliente = cfdi.nombre_receptor || rfcCliente;
    const monto = parseFloat(cfdi.total) || 0;

    if (!clientesMap.has(rfcCliente)) {
      clientesMap.set(rfcCliente, {
        rfc: rfcCliente,
        nombre: nombreCliente,
        totalMonto: 0,
        cantidad: 0
      });
    }

    const cliente = clientesMap.get(rfcCliente);
    cliente.totalMonto += monto;
    cliente.cantidad += 1;
  });

  return Array.from(clientesMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, top)
    .map(c => ({
      ...c,
      totalMonto: parseFloat(c.totalMonto.toFixed(2))
    }));
}

/**
 * Calcula análisis temporal por mes
 */
private async calcularAnalisisTemporal(cfdis: any[]): Promise<any[]> {
  const porMes = new Map();

  cfdis.forEach(cfdi => {
    const fecha = new Date(cfdi.fecha);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const monto = parseFloat(cfdi.total) || 0;

    if (!porMes.has(mes)) {
      porMes.set(mes, {
        periodo: mes,
        cantidad: 0,
        total: 0,
        subtotal: 0,
        iva: 0
      });
    }

    const mesData = porMes.get(mes);
    mesData.cantidad += 1;
    mesData.total += monto;
    mesData.subtotal += parseFloat(cfdi.sub_total) || 0;
    mesData.iva += parseFloat(cfdi.iva_trasladado) || 0;
  });

  return Array.from(porMes.values())
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map(m => ({
      ...m,
      total: parseFloat(m.total.toFixed(2)),
      subtotal: parseFloat(m.subtotal.toFixed(2)),
      iva: parseFloat(m.iva.toFixed(2))
    }));
}

/**
 * Agrupa por forma de pago
 */
private async agruparPorFormaPago(cfdis: any[]): Promise<any[]> {
  const porFormaPago = new Map();

  cfdis.forEach(cfdi => {
    const formaPago = cfdi.forma_pago || 'NO ESPECIFICADO';
    const monto = parseFloat(cfdi.total) || 0;

    if (!porFormaPago.has(formaPago)) {
      porFormaPago.set(formaPago, {
        formaPago,
        cantidad: 0,
        total: 0
      });
    }

    const fp = porFormaPago.get(formaPago);
    fp.cantidad += 1;
    fp.total += monto;
  });

  return Array.from(porFormaPago.values())
    .sort((a, b) => b.total - a.total)
    .map(fp => ({
      ...fp,
      total: parseFloat(fp.total.toFixed(2))
    }));
}

/**
 * Agrupa por método de pago
 */
private async agruparPorMetodoPago(cfdis: any[]): Promise<any[]> {
  const porMetodoPago = new Map();

  cfdis.forEach(cfdi => {
    const metodoPago = cfdi.metodo_pago || 'NO ESPECIFICADO';
    const monto = parseFloat(cfdi.total) || 0;

    if (!porMetodoPago.has(metodoPago)) {
      porMetodoPago.set(metodoPago, {
        metodoPago,
        cantidad: 0,
        total: 0
      });
    }

    const mp = porMetodoPago.get(metodoPago);
    mp.cantidad += 1;
    mp.total += monto;
  });

  return Array.from(porMetodoPago.values())
    .sort((a, b) => b.total - a.total)
    .map(mp => ({
      ...mp,
      total: parseFloat(mp.total.toFixed(2))
    }));
}

/**
 * Agrupa por uso de CFDI
 */
private async agruparPorUsoCfdi(cfdis: any[]): Promise<any[]> {
  const porUsoCfdi = new Map();

  cfdis.forEach(cfdi => {
    const usoCfdi = cfdi.uso_cfdi || 'NO ESPECIFICADO';
    const monto = parseFloat(cfdi.total) || 0;

    if (!porUsoCfdi.has(usoCfdi)) {
      porUsoCfdi.set(usoCfdi, {
        usoCfdi,
        cantidad: 0,
        total: 0
      });
    }

    const uc = porUsoCfdi.get(usoCfdi);
    uc.cantidad += 1;
    uc.total += monto;
  });

  return Array.from(porUsoCfdi.values())
    .sort((a, b) => b.total - a.total)
    .map(uc => ({
      ...uc,
      total: parseFloat(uc.total.toFixed(2))
    }));
}

/**
 * Calcula retenciones totales
 */
private async calcularRetenciones(cfdis: any[]): Promise<any> {
  const ivaRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.iva_retenido) || 0), 0);
  const isrRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.isr_retenido) || 0), 0);
  const iepsRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.ieps_retenido) || 0), 0);

  return {
    ivaRetenido: parseFloat(ivaRetenido.toFixed(2)),
    isrRetenido: parseFloat(isrRetenido.toFixed(2)),
    iepsRetenido: parseFloat(iepsRetenido.toFixed(2)),
    totalRetenido: parseFloat((ivaRetenido + isrRetenido + iepsRetenido).toFixed(2))
  };
}

/**
 * Obtiene clientes que no han facturado en X días
 */
private async obtenerClientesInactivos(
  rfcUsuario: string,
  fechaReferencia: string,
  diasInactividad: number
): Promise<any[]> {
  const fechaLimite = new Date(fechaReferencia);
  fechaLimite.setDate(fechaLimite.getDate() - diasInactividad);

  const query = `
    SELECT 
      rfc_receptor as rfc,
      nombre_receptor as nombre,
      MAX(fecha) as ultima_factura,
      COUNT(*) as total_facturas,
      SUM(total) as total_monto
    FROM xmls_financieros
    WHERE rfc_emisor = $1
      AND tipo_comprobante = 'I'
    GROUP BY rfc_receptor, nombre_receptor
    HAVING MAX(fecha) < $2
    ORDER BY MAX(fecha) DESC
    LIMIT 10
  `;

  try {
    const result = await this.xmlFinancieroRepository.query(query, [
      rfcUsuario,
      fechaLimite.toISOString()
    ]);

    return result.map((r: any) => ({
      rfc: r.rfc,
      nombre: r.nombre,
      ultimaFactura: r.ultima_factura,
      diasInactivo: Math.floor(
        (new Date(fechaReferencia).getTime() - new Date(r.ultima_factura).getTime()) 
        / (1000 * 60 * 60 * 24)
      ),
      totalFacturas: parseInt(r.total_facturas),
      totalMonto: parseFloat(parseFloat(r.total_monto).toFixed(2))
    }));
  } catch (error) {
    this.logger.error('Error obteniendo clientes inactivos:', error);
    return [];
  }
}
/**
 * Obtiene análisis completo de egresos para el usuario
 */
async getAnalisisCompletoEgresos(
  rfcUsuario: string,
  fechaInicio: string,
  fechaFin: string
): Promise<any> {
  this.logger.log('====== ANÁLISIS COMPLETO DE EGRESOS ======');
  this.logger.log(`RFC Usuario: ${rfcUsuario}`);
  this.logger.log(`Período: ${fechaInicio} a ${fechaFin}`);

  try {
    const cfdis = await this.getCfdisEgreso(rfcUsuario, fechaInicio, fechaFin);

    // 1. RESUMEN GENERAL
    const resumenGeneral = await this.calcularResumenGeneralEgresos(cfdis);

    // 2. TOP PROVEEDORES POR MONTO
    // ✅ CORRECCIÓN: Pasar rfcUsuario como segundo parámetro
    const topProveedoresPorMonto = await this.calcularTopProveedoresPorMonto(
      cfdis, 
      rfcUsuario,  // ← AGREGAR
      5
    );

    // 3. TOP PROVEEDORES POR CANTIDAD
    // ✅ CORRECCIÓN: Pasar rfcUsuario como segundo parámetro
    const topProveedoresPorCantidad = await this.calcularTopProveedoresPorCantidad(
      cfdis,
      rfcUsuario,  // ← AGREGAR
      5
    );

    // 4. ANÁLISIS TEMPORAL
    const analisisTemporal = await this.calcularAnalisisTemporalEgresos(cfdis);

    // 5. FORMA DE PAGO
    const porFormaPago = await this.agruparPorFormaPagoEgresos(cfdis);

    // 6. USO DE CFDI
    const porUsoCfdi = await this.agruparPorUsoCfdiEgresos(cfdis);

    // 7. TIPO DE GASTO
    const porTipoGasto = await this.clasificarPorTipoGasto(cfdis);

    // 8. INFORMACIÓN FISCAL
    const informacionFiscal = await this.calcularInformacionFiscalEgresos(cfdis);

    // 9. GASTOS RECURRENTES
    // ✅ CORRECCIÓN: Pasar rfcUsuario como segundo parámetro
    const gastosRecurrentes = await this.detectarGastosRecurrentes(
      cfdis,
      rfcUsuario  // ← AGREGAR
    );

    // 10. PROVEEDORES NUEVOS
    const proveedoresNuevos = await this.obtenerProveedoresNuevos(
      rfcUsuario,
      fechaInicio,
      fechaFin
    );

    return {
      resumenGeneral,
      topProveedoresPorMonto,
      topProveedoresPorCantidad,
      analisisTemporal,
      porFormaPago,
      porUsoCfdi,
      porTipoGasto,
      informacionFiscal,
      gastosRecurrentes,
      proveedoresNuevos,
      totalCfdis: cfdis.length
    };
  } catch (error) {
    this.logger.error('Error en análisis completo de egresos:', error);
    throw error;
  }
}

/**
 * Calcula resumen general de egresos
 */
private async calcularResumenGeneralEgresos(cfdis: any[]): Promise<any> {
  const totalCfdis = cfdis.length;
  const cfdisCancelados = cfdis.filter(c => c.estado_procesamiento === 'CANCELADO').length;
  const cfdisVigentes = totalCfdis - cfdisCancelados;

  const subtotal = cfdis.reduce((sum, c) => sum + (parseFloat(c.sub_total) || 0), 0);
  const ivaTotal = cfdis.reduce((sum, c) => sum + (parseFloat(c.iva_trasladado) || 0), 0);
  const total = cfdis.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
  
  const montoCancelados = cfdis
    .filter(c => c.estado_procesamiento === 'CANCELADO')
    .reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

  const promedioGasto = cfdisVigentes > 0 ? total / cfdisVigentes : 0;
  const porcentajeVigentes = totalCfdis > 0 ? (cfdisVigentes / totalCfdis) * 100 : 0;

  return {
    totalCfdis,
    cfdisVigentes,
    cfdisCancelados,
    subtotal: parseFloat(subtotal.toFixed(2)),
    ivaTotal: parseFloat(ivaTotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    montoCancelados: parseFloat(montoCancelados.toFixed(2)),
    promedioGasto: parseFloat(promedioGasto.toFixed(2)),
    porcentajeVigentes: parseFloat(porcentajeVigentes.toFixed(2))
  };
}

/**
 * Calcula top proveedores por monto
 */
private async calcularTopProveedoresPorMonto(
  cfdis: any[], 
  rfcUsuario: string,  // ← ESTE PARÁMETRO YA ESTÁ
  top: number = 5
): Promise<any[]> {
  const proveedoresMap = new Map();

  cfdis.forEach(cfdi => {
    let rfcProveedor: string;
    let nombreProveedor: string;
    
    // ✅ CORRECCIÓN: Usar rfcUsuario directamente (no this.getCurrentUserRfc())
    if (cfdi.tipo_comprobante === 'N' && cfdi.rfc_emisor === rfcUsuario) {
      rfcProveedor = cfdi.rfc_receptor;
      nombreProveedor = cfdi.nombre_receptor || rfcProveedor;
    } else {
      rfcProveedor = cfdi.rfc_emisor;
      nombreProveedor = cfdi.nombre_emisor || rfcProveedor;
    }
    
    const monto = parseFloat(cfdi.total) || 0;

    if (!proveedoresMap.has(rfcProveedor)) {
      proveedoresMap.set(rfcProveedor, {
        rfc: rfcProveedor,
        nombre: nombreProveedor,
        totalMonto: 0,
        cantidad: 0
      });
    }

    const proveedor = proveedoresMap.get(rfcProveedor);
    proveedor.totalMonto += monto;
    proveedor.cantidad += 1;
  });

  return Array.from(proveedoresMap.values())
    .sort((a, b) => b.totalMonto - a.totalMonto)
    .slice(0, top)
    .map(p => ({
      ...p,
      totalMonto: parseFloat(p.totalMonto.toFixed(2))
    }));
}

/**
 * Calcula top proveedores por cantidad de CFDIs
 * CORREGIDO: Maneja correctamente nóminas donde el usuario es emisor
 */
private async calcularTopProveedoresPorCantidad(
  cfdis: any[], 
  rfcUsuario: string,  // ← AGREGAR ESTE PARÁMETRO
  top: number = 5
): Promise<any[]> {
  const proveedoresMap = new Map();

  cfdis.forEach(cfdi => {
    let rfcProveedor: string;
    let nombreProveedor: string;
    
    // Usar rfcUsuario directamente (no this.getCurrentUserRfc())
    if (cfdi.tipo_comprobante === 'N' && cfdi.rfc_emisor === rfcUsuario) {
      rfcProveedor = cfdi.rfc_receptor;
      nombreProveedor = cfdi.nombre_receptor || rfcProveedor;
    } else {
      rfcProveedor = cfdi.rfc_emisor;
      nombreProveedor = cfdi.nombre_emisor || rfcProveedor;
    }
    
    const monto = parseFloat(cfdi.total) || 0;

    if (!proveedoresMap.has(rfcProveedor)) {
      proveedoresMap.set(rfcProveedor, {
        rfc: rfcProveedor,
        nombre: nombreProveedor,
        totalMonto: 0,
        cantidad: 0
      });
    }

    const proveedor = proveedoresMap.get(rfcProveedor);
    proveedor.totalMonto += monto;
    proveedor.cantidad += 1;
  });

  return Array.from(proveedoresMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, top)
    .map(p => ({
      ...p,
      totalMonto: parseFloat(p.totalMonto.toFixed(2))
    }));
}

/**
 * Calcula análisis temporal por mes
 */
private async calcularAnalisisTemporalEgresos(cfdis: any[]): Promise<any[]> {
  const porMes = new Map();

  cfdis.forEach(cfdi => {
    const fecha = new Date(cfdi.fecha);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const monto = parseFloat(cfdi.total) || 0;

    if (!porMes.has(mes)) {
      porMes.set(mes, {
        periodo: mes,
        cantidad: 0,
        total: 0,
        subtotal: 0,
        iva: 0
      });
    }

    const mesData = porMes.get(mes);
    mesData.cantidad += 1;
    mesData.total += monto;
    mesData.subtotal += parseFloat(cfdi.sub_total) || 0;
    mesData.iva += parseFloat(cfdi.iva_trasladado) || 0;
  });

  return Array.from(porMes.values())
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map(m => ({
      ...m,
      total: parseFloat(m.total.toFixed(2)),
      subtotal: parseFloat(m.subtotal.toFixed(2)),
      iva: parseFloat(m.iva.toFixed(2))
    }));
}

/**
 * Agrupa por forma de pago
 */
private async agruparPorFormaPagoEgresos(cfdis: any[]): Promise<any[]> {
  const porFormaPago = new Map();

  cfdis.forEach(cfdi => {
    const formaPago = cfdi.forma_pago || 'NO ESPECIFICADO';
    const monto = parseFloat(cfdi.total) || 0;

    if (!porFormaPago.has(formaPago)) {
      porFormaPago.set(formaPago, {
        formaPago,
        cantidad: 0,
        total: 0
      });
    }

    const fp = porFormaPago.get(formaPago);
    fp.cantidad += 1;
    fp.total += monto;
  });

  return Array.from(porFormaPago.values())
    .sort((a, b) => b.total - a.total)
    .map(fp => ({
      ...fp,
      total: parseFloat(fp.total.toFixed(2))
    }));
}

/**
 * Agrupa por uso de CFDI
 */
private async agruparPorUsoCfdiEgresos(cfdis: any[]): Promise<any[]> {
  const porUsoCfdi = new Map();

  cfdis.forEach(cfdi => {
    const usoCfdi = cfdi.uso_cfdi || 'NO ESPECIFICADO';
    const monto = parseFloat(cfdi.total) || 0;

    if (!porUsoCfdi.has(usoCfdi)) {
      porUsoCfdi.set(usoCfdi, {
        usoCfdi,
        cantidad: 0,
        total: 0
      });
    }

    const uc = porUsoCfdi.get(usoCfdi);
    uc.cantidad += 1;
    uc.total += monto;
  });

  return Array.from(porUsoCfdi.values())
    .sort((a, b) => b.total - a.total)
    .map(uc => ({
      ...uc,
      total: parseFloat(uc.total.toFixed(2))
    }));
}

/**
 * Clasifica por tipo de gasto (deducible/no deducible)
 */
private async clasificarPorTipoGasto(cfdis: any[]): Promise<any> {
  // Usos de CFDI deducibles comunes
  const usosDeducibles = ['G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10'];
  
  let deducibles = 0;
  let noDeducibles = 0;
  let cantidadDeducibles = 0;
  let cantidadNoDeducibles = 0;

  cfdis.forEach(cfdi => {
    const monto = parseFloat(cfdi.total) || 0;
    const usoCfdi = cfdi.uso_cfdi || '';

    if (usosDeducibles.includes(usoCfdi)) {
      deducibles += monto;
      cantidadDeducibles += 1;
    } else {
      noDeducibles += monto;
      cantidadNoDeducibles += 1;
    }
  });

  return {
    deducibles: parseFloat(deducibles.toFixed(2)),
    noDeducibles: parseFloat(noDeducibles.toFixed(2)),
    cantidadDeducibles,
    cantidadNoDeducibles,
    porcentajeDeducibles: cfdis.length > 0 
      ? parseFloat(((cantidadDeducibles / cfdis.length) * 100).toFixed(2))
      : 0
  };
}

/**
 * Calcula información fiscal
 */
private async calcularInformacionFiscalEgresos(cfdis: any[]): Promise<any> {
  const ivaAcreditable = cfdis.reduce((sum, c) => sum + (parseFloat(c.iva_trasladado) || 0), 0);
  const isrRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.isr_retenido) || 0), 0);
  const ivaRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.iva_retenido) || 0), 0);
  const iepsRetenido = cfdis.reduce((sum, c) => sum + (parseFloat(c.ieps_retenido) || 0), 0);

  // CFDIs con complemento de pago (tipo P)
  const cfdisPago = cfdis.filter(c => c.tipo_comprobante === 'P').length;

  return {
    ivaAcreditable: parseFloat(ivaAcreditable.toFixed(2)),
    isrRetenido: parseFloat(isrRetenido.toFixed(2)),
    ivaRetenido: parseFloat(ivaRetenido.toFixed(2)),
    iepsRetenido: parseFloat(iepsRetenido.toFixed(2)),
    cfdisPago,
    totalRetenciones: parseFloat((isrRetenido + ivaRetenido + iepsRetenido).toFixed(2))
  };
}

/**
 * Detecta gastos recurrentes (proveedores con más de 2 CFDIs en el período)
 */
private async detectarGastosRecurrentes(
  cfdis: any[],
  rfcUsuario: string  // ← AGREGAR ESTE PARÁMETRO
): Promise<any[]> {
  const proveedoresMap = new Map();

  cfdis.forEach(cfdi => {
    let rfcProveedor: string;
    let nombreProveedor: string;
    
    // ✅ Usar rfcUsuario directamente
    if (cfdi.tipo_comprobante === 'N' && cfdi.rfc_emisor === rfcUsuario) {
      rfcProveedor = cfdi.rfc_receptor;
      nombreProveedor = cfdi.nombre_receptor || rfcProveedor;
    } else {
      rfcProveedor = cfdi.rfc_emisor;
      nombreProveedor = cfdi.nombre_emisor || rfcProveedor;
    }
    
    const monto = parseFloat(cfdi.total) || 0;

    if (!proveedoresMap.has(rfcProveedor)) {
      proveedoresMap.set(rfcProveedor, {
        rfc: rfcProveedor,
        nombre: nombreProveedor,
        cantidad: 0,
        totalMonto: 0,
        fechas: []
      });
    }

    const proveedor = proveedoresMap.get(rfcProveedor);
    proveedor.cantidad += 1;
    proveedor.totalMonto += monto;
    proveedor.fechas.push(cfdi.fecha);
  });

  return Array.from(proveedoresMap.values())
    .filter(p => p.cantidad > 2)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)
    .map(p => ({
      rfc: p.rfc,
      nombre: p.nombre,
      cantidad: p.cantidad,
      totalMonto: parseFloat(p.totalMonto.toFixed(2)),
      montoPromedio: parseFloat((p.totalMonto / p.cantidad).toFixed(2)),
      frecuencia: 'Recurrente'
    }));
}

/**
 * Obtiene proveedores nuevos del período
 */
private async obtenerProveedoresNuevos(
  rfcUsuario: string,
  fechaInicio: string,
  fechaFin: string
): Promise<any[]> {
  const query = `
    SELECT 
      rfc_emisor as rfc,
      nombre_emisor as nombre,
      MIN(fecha) as primera_factura,
      COUNT(*) as cantidad_facturas,
      SUM(total) as total_monto
    FROM xmls_financieros
    WHERE rfc_receptor = $1
      AND tipo_comprobante != 'N'
      AND fecha BETWEEN $2 AND $3
    GROUP BY rfc_emisor, nombre_emisor
    HAVING MIN(fecha) BETWEEN $2 AND $3
    ORDER BY MIN(fecha) DESC
    LIMIT 10
  `;

  try {
    const result = await this.xmlFinancieroRepository.query(query, [
      rfcUsuario,
      fechaInicio,
      fechaFin
    ]);

    return result.map((r: any) => ({
      rfc: r.rfc,
      nombre: r.nombre,
      primeraFactura: r.primera_factura,
      cantidadFacturas: parseInt(r.cantidad_facturas),
      totalMonto: parseFloat(parseFloat(r.total_monto).toFixed(2))
    }));
  } catch (error) {
    this.logger.error('Error obteniendo proveedores nuevos:', error);
    return [];
  }
}
// ====== MÉTODOS DE BÚSQUEDA AVANZADA PARA EGRESOS ======

/**
 * Búsqueda rápida de egresos (incluye Tipo E, N y P)
 * ✅ BUSCA POR RFC DEL RECEPTOR (como patrón)
 */
async buscarCfdisEgresos(
  rfcUsuario: string,
  filtros: any
): Promise<{ cfdis: any[], total: number }> {
  this.logger.debug('=== INICIO buscarCfdisEgresos ===');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Filtros completos:', JSON.stringify(filtros, null, 2));

  try {
    // ✅ CORRECCIÓN: EGRESOS son documentos donde el usuario es RECEPTOR (quien compra/gasta)
    // Incluye:
    // 1. Facturas de Ingreso (I) donde el usuario es receptor
    // 2. Facturas de Egreso (E) - devoluciones, descuentos
    // 3. Facturas de Pago (P) - complementos de pago
    // 4. Nóminas (N) donde el usuario es receptor (nómina recibida como empleado)
    
    const query = this.xmlFinancieroRepository
      .createQueryBuilder('cfdi')
      .where('cfdi.rfc_receptor = :rfc', { rfc: rfcUsuario })
      .andWhere('cfdi.tipo_comprobante IN (:...tipos)', { 
        tipos: ['I', 'E', 'P', 'N']  // ✅ Incluir TODOS los tipos donde somos receptores
      });

    this.logger.debug('✅ Buscando CFDIs donde el usuario es RECEPTOR');

    // Aplicar filtro de búsqueda si existe
    if (filtros.query && filtros.query.trim() !== '') {
      const searchTerm = `%${filtros.query}%`;
      this.logger.debug('🔍 Aplicando filtro de búsqueda:', searchTerm);
      
      query.andWhere(
        '(' +
        'cfdi.folio_fiscal ILIKE :search OR ' +
        'cfdi.nombre_emisor ILIKE :search OR ' +      // ✅ Nombre del proveedor
        'cfdi.rfc_emisor ILIKE :search OR ' +         // ✅ RFC del proveedor
        'cfdi.nombre_receptor ILIKE :search OR ' +
        'cfdi.rfc_receptor ILIKE :search OR ' +
        'cfdi.folio ILIKE :search OR ' +
        'cfdi.serie ILIKE :search OR ' +
        'CAST(cfdi.conceptos_detalle AS TEXT) ILIKE :search' +
        ')',
        { search: searchTerm }
      );
    }

    // Filtro de rango de fechas
    if (filtros.fechaInicio && filtros.fechaFin) {
      this.logger.debug('📅 Aplicando filtro de fechas:', { 
        fechaInicio: filtros.fechaInicio, 
        fechaFin: filtros.fechaFin 
      });
      query.andWhere('cfdi.fecha BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin
      });
    }

    // Filtro de rango de montos
    if (filtros.montoMin !== undefined) {
      this.logger.debug('💰 Aplicando filtro monto mínimo:', filtros.montoMin);
      query.andWhere('cfdi.total >= :montoMin', { montoMin: filtros.montoMin });
    }
    if (filtros.montoMax !== undefined) {
      this.logger.debug('💰 Aplicando filtro monto máximo:', filtros.montoMax);
      query.andWhere('cfdi.total <= :montoMax', { montoMax: filtros.montoMax });
    }

    // Filtro por tipo específico
    if (filtros.tipoComprobante) {
      this.logger.debug('📋 Aplicando filtro de tipo:', filtros.tipoComprobante);
      query.andWhere('cfdi.tipo_comprobante = :tipo', { tipo: filtros.tipoComprobante });
    }

    // Contar total con los filtros aplicados
    const total = await query.getCount();
    this.logger.debug(`📊 Total después de aplicar filtros: ${total}`);

    // Obtener resultados con paginación
    const cfdis = await query
      .orderBy('cfdi.fecha', 'DESC')
      .skip(filtros.offset || 0)
      .take(filtros.limit || 50)
      .getMany();

    this.logger.debug(`📋 CFDIs obtenidos: ${cfdis.length}`);

    // Agregar etiqueta de tipo
    const cfdisConEtiqueta = cfdis.map(cfdi => ({
      ...cfdi,
      tipo_documento_label: this.getTipoDocumentoLabel(cfdi.tipo_comprobante)
    }));

    this.logger.debug('=== FIN buscarCfdisEgresos ===');

    return {
      cfdis: cfdisConEtiqueta,
      total
    };

  } catch (error) {
    this.logger.error('❌ Error en búsqueda de egresos:', error.message);
    this.logger.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Búsqueda rápida de ingresos
 * ✅ Para INGRESOS (I), el usuario es el EMISOR (quien vende/factura)
 */
async buscarCfdisIngresos(
  rfcUsuario: string,
  filtros: any
): Promise<{ cfdis: any[], total: number }> {
  this.logger.debug('=== INICIO buscarCfdisIngresos ===');
  this.logger.debug('RFC Usuario:', rfcUsuario);
  this.logger.debug('Filtros completos:', JSON.stringify(filtros, null, 2));
  
  try {
    // ✅ Buscar donde el usuario es el EMISOR (quien vende/factura)
    const query = this.xmlFinancieroRepository
      .createQueryBuilder('cfdi')
      .where('cfdi.rfc_emisor = :rfc', { rfc: rfcUsuario })
      .andWhere('cfdi.tipo_comprobante = :tipo', { tipo: 'I' });

    // Aplicar filtro de búsqueda si existe
    if (filtros.query && filtros.query.trim() !== '') {
      const searchTerm = `%${filtros.query}%`;
      this.logger.debug('🔍 Aplicando filtro de búsqueda:', searchTerm);
      
      // ✅ Usar ILIKE para búsqueda case-insensitive
      query.andWhere(
        '(' +
        'cfdi.folio_fiscal ILIKE :search OR ' +
        'cfdi.nombre_emisor ILIKE :search OR ' +
        'cfdi.rfc_emisor ILIKE :search OR ' +
        'cfdi.nombre_receptor ILIKE :search OR ' +   // Cliente
        'cfdi.rfc_receptor ILIKE :search OR ' +
        'cfdi.folio ILIKE :search OR ' +
        'cfdi.serie ILIKE :search OR ' +
        'CAST(cfdi.conceptos_detalle AS TEXT) ILIKE :search' +  // ✅ Buscar en conceptos
        ')',
        { search: searchTerm }
      );
    }

    // Filtro de rango de fechas
    if (filtros.fechaInicio && filtros.fechaFin) {
      this.logger.debug('📅 Aplicando filtro de fechas:', { 
        fechaInicio: filtros.fechaInicio, 
        fechaFin: filtros.fechaFin 
      });
      query.andWhere('cfdi.fecha BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin
      });
    }

    // Filtro de rango de montos
    if (filtros.montoMin !== undefined) {
      this.logger.debug('💰 Aplicando filtro monto mínimo:', filtros.montoMin);
      query.andWhere('cfdi.total >= :montoMin', { montoMin: filtros.montoMin });
    }
    if (filtros.montoMax !== undefined) {
      this.logger.debug('💰 Aplicando filtro monto máximo:', filtros.montoMax);
      query.andWhere('cfdi.total <= :montoMax', { montoMax: filtros.montoMax });
    }

    // Filtro por tipo específico (aunque ya filtramos por 'I', esto es por si se extiende)
    if (filtros.tipoComprobante) {
      this.logger.debug('📋 Aplicando filtro de tipo:', filtros.tipoComprobante);
      query.andWhere('cfdi.tipo_comprobante = :tipo', { tipo: filtros.tipoComprobante });
    }

    // Contar total con los filtros aplicados
    const total = await query.getCount();
    this.logger.debug(`📊 Total después de aplicar filtros: ${total}`);
    
    // Obtener resultados con paginación
    const cfdis = await query
      .orderBy('cfdi.fecha', 'DESC')
      .skip(filtros.offset || 0)
      .take(filtros.limit || 50)
      .getMany();

    this.logger.debug(`📋 CFDIs obtenidos: ${cfdis.length}`);

    // Agregar etiqueta de tipo
    const cfdisConEtiqueta = cfdis.map(cfdi => ({
      ...cfdi,
      tipo_documento_label: this.getTipoDocumentoLabel(cfdi.tipo_comprobante)
    }));

    this.logger.debug('=== FIN buscarCfdisIngresos ===');

    return { 
      cfdis: cfdisConEtiqueta, 
      total 
    };

  } catch (error) {
    this.logger.error('❌ Error en búsqueda de ingresos:', error.message);
    this.logger.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Helper: Obtiene la etiqueta del tipo de documento
 */
private getTipoDocumentoLabel(tipo: string): string {
  switch (tipo) {
    case 'I': return 'Ingreso';
    case 'E': return 'Egreso';
    case 'N': return 'Nómina';
    case 'P': return 'Pago';
    case 'T': return 'Traslado';
    default: return 'Desconocido';
  }
}

/**
 * Búsqueda avanzada de CFDIs de egresos con múltiples filtros
 */
async busquedaAvanzadaEgresos(rfcUsuario: string, filtros: any): Promise<any> {
  this.logger.debug('🔍 Búsqueda avanzada de egresos:', { rfcUsuario, filtros });

  try {
    const qb = this.xmlFinancieroRepository.createQueryBuilder('cfdi');

    // Regla base: Receptor = Usuario (excepto Nómina)
    qb.where('cfdi.rfc_receptor = :rfcUsuario', { rfcUsuario })
      .andWhere('cfdi.tipo_comprobante != :tipoNomina', { tipoNomina: 'N' });

    // Filtros adicionales
    if (filtros.rfc) {
      qb.andWhere('cfdi.rfc_emisor ILIKE :rfc', { rfc: `%${filtros.rfc}%` });
    }

    if (filtros.nombre) {
      qb.andWhere('cfdi.nombre_emisor ILIKE :nombre', { nombre: `%${filtros.nombre}%` });
    }

    if (filtros.uuid) {
      qb.andWhere('cfdi.folio_fiscal ILIKE :uuid', { uuid: `%${filtros.uuid}%` });
    }

    if (filtros.folio) {
      qb.andWhere('cfdi.folio ILIKE :folio', { folio: `%${filtros.folio}%` });
    }

    if (filtros.serie) {
      qb.andWhere('cfdi.serie ILIKE :serie', { serie: `%${filtros.serie}%` });
    }

    if (filtros.fechaInicio) {
      qb.andWhere('cfdi.fecha >= :fechaInicio', { fechaInicio: filtros.fechaInicio });
    }

    if (filtros.fechaFin) {
      qb.andWhere('cfdi.fecha <= :fechaFin', { fechaFin: filtros.fechaFin });
    }

    if (filtros.montoMin !== undefined && filtros.montoMin !== null) {
      qb.andWhere('cfdi.total >= :montoMin', { montoMin: filtros.montoMin });
    }

    if (filtros.montoMax !== undefined && filtros.montoMax !== null) {
      qb.andWhere('cfdi.total <= :montoMax', { montoMax: filtros.montoMax });
    }

    const cfdis = await qb
      .orderBy('cfdi.fecha', 'DESC')
      .getMany();

    return {
      success: true,
      cfdis,
      total: cfdis.length
    };
  } catch (error) {
    this.logger.error('❌ Error en búsqueda avanzada de egresos:', error);
    throw error;
  }
}

// ====== MÉTODOS DE BÚSQUEDA AVANZADA PARA INGRESOS ======


/**
 * Búsqueda avanzada de CFDIs de ingresos con múltiples filtros
 */
async busquedaAvanzadaIngresos(rfcUsuario: string, filtros: any): Promise<any> {
  this.logger.debug('🔍 Búsqueda avanzada de ingresos:', { rfcUsuario, filtros });

  try {
    const qb = this.xmlFinancieroRepository.createQueryBuilder('cfdi');

    // Regla base: Emisor = Usuario
    qb.where('cfdi.rfc_emisor = :rfcUsuario', { rfcUsuario })
      .andWhere('cfdi.tipo_comprobante = :tipoIngreso', { tipoIngreso: 'I' });

    // Filtros adicionales (busca en datos del receptor/cliente)
    if (filtros.rfc) {
      qb.andWhere('cfdi.rfc_receptor ILIKE :rfc', { rfc: `%${filtros.rfc}%` });
    }

    if (filtros.nombre) {
      qb.andWhere('cfdi.nombre_receptor ILIKE :nombre', { nombre: `%${filtros.nombre}%` });
    }

    if (filtros.uuid) {
      qb.andWhere('cfdi.folio_fiscal ILIKE :uuid', { uuid: `%${filtros.uuid}%` });
    }

    if (filtros.folio) {
      qb.andWhere('cfdi.folio ILIKE :folio', { folio: `%${filtros.folio}%` });
    }

    if (filtros.serie) {
      qb.andWhere('cfdi.serie ILIKE :serie', { serie: `%${filtros.serie}%` });
    }

    if (filtros.fechaInicio) {
      qb.andWhere('cfdi.fecha >= :fechaInicio', { fechaInicio: filtros.fechaInicio });
    }

    if (filtros.fechaFin) {
      qb.andWhere('cfdi.fecha <= :fechaFin', { fechaFin: filtros.fechaFin });
    }

    if (filtros.montoMin !== undefined && filtros.montoMin !== null) {
      qb.andWhere('cfdi.total >= :montoMin', { montoMin: filtros.montoMin });
    }

    if (filtros.montoMax !== undefined && filtros.montoMax !== null) {
      qb.andWhere('cfdi.total <= :montoMax', { montoMax: filtros.montoMax });
    }

    if (filtros.metodoPago) {
      qb.andWhere('cfdi.metodo_pago = :metodoPago', { metodoPago: filtros.metodoPago });
    }

    if (filtros.formaPago) {
      qb.andWhere('cfdi.forma_pago = :formaPago', { formaPago: filtros.formaPago });
    }

    const cfdis = await qb
      .orderBy('cfdi.fecha', 'DESC')
      .getMany();

    return {
      success: true,
      cfdis,
      total: cfdis.length
    };
  } catch (error) {
    this.logger.error('❌ Error en búsqueda avanzada de ingresos:', error);
    throw error;
  }
}

// ====== MÉTODOS PARA DETALLES DE CFDI ======

/**
 * Obtiene los detalles completos de un CFDI por UUID
 */
async getDetallesCfdi(uuid: string): Promise<any> {
  this.logger.debug('🔍 Obteniendo detalles de CFDI:', uuid);

  try {
    const cfdi = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    if (!cfdi) {
      throw new Error('CFDI no encontrado');
    }

    return {
      success: true,
      cfdi
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo detalles de CFDI:', error);
    throw error;
  }
}

/**
 * Obtiene los impuestos de un CFDI
 */
async getImpuestosCfdi(uuid: string): Promise<any> {
  this.logger.debug('🔍 Obteniendo impuestos de CFDI:', uuid);

  try {
    const cfdi = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    if (!cfdi) {
      throw new Error('CFDI no encontrado');
    }

    const impuestos = [
      {
        tipo: 'Trasladado',
        impuesto: 'IVA',
        tasa: 16,
        importe: cfdi.iva_trasladado
      }
    ];

    return {
      success: true,
      impuestos
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo impuestos:', error);
    throw error;
  }
}

/**
 * Obtiene las retenciones de un CFDI
 */
async getRetencionesCfdi(uuid: string): Promise<any> {
  this.logger.debug('🔍 Obteniendo retenciones de CFDI:', uuid);

  try {
    const cfdi = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    if (!cfdi) {
      throw new Error('CFDI no encontrado');
    }

    const retenciones = [];

    if (cfdi.iva_retenido > 0) {
      retenciones.push({
        impuesto: 'IVA Retenido',
        importe: cfdi.iva_retenido
      });
    }

    if (cfdi.isr_retenido > 0) {
      retenciones.push({
        impuesto: 'ISR Retenido',
        importe: cfdi.isr_retenido
      });
    }

    if (cfdi.ieps_retenido > 0) {
      retenciones.push({
        impuesto: 'IEPS Retenido',
        importe: cfdi.ieps_retenido
      });
    }

    return {
      success: true,
      retenciones
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo retenciones:', error);
    throw error;
  }
}

/**
 * Obtiene las partidas/conceptos de un CFDI
 */
async getPartidasCfdi(uuid: string): Promise<any> {
  this.logger.debug('🔍 Obteniendo partidas de CFDI:', uuid);

  try {
    const cfdi = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    if (!cfdi) {
      throw new Error('CFDI no encontrado');
    }

    // Si tienes conceptos_detalle en JSON
    const partidas = cfdi.conceptos_detalle || [];

    return {
      success: true,
      partidas
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo partidas:', error);
    throw error;
  }
}

/**
 * Obtiene los pagos relacionados de un CFDI (para PPD)
 */
async getPagosCfdi(uuid: string): Promise<any> {
  this.logger.debug('🔍 Obteniendo pagos de CFDI:', uuid);

  try {
    // TODO: Implementar búsqueda de complementos de pago relacionados
    // Esto requeriría una tabla adicional o buscar en XMLs tipo 'P'
    
    return {
      success: true,
      pagos: []
    };
  } catch (error) {
    this.logger.error('❌ Error obteniendo pagos:', error);
    throw error;
  }
}
/**
 * Descarga el XML de un CFDI
 */
async descargarXml(uuid: string): Promise<any> {
  this.logger.debug('=== INICIO descargarXml ===');
  this.logger.debug('UUID recibido:', uuid);

  try {
    // 1. Buscar en xmls_financieros
    this.logger.debug('🔍 Paso 1: Buscando en xmls_financieros...');
    
    const cfdiFinanciero = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    if (!cfdiFinanciero) {
      this.logger.error('❌ No se encontró el CFDI en xmls_financieros');
      throw new Error('CFDI no encontrado');
    }

    this.logger.debug('✅ CFDI encontrado:', {
      id: cfdiFinanciero.id,
      rfc_emisor: cfdiFinanciero.rfc_emisor,
      folio: cfdiFinanciero.folio,
      serie: cfdiFinanciero.serie,
      usuario_id: cfdiFinanciero.usuario_id
    });

    // 2. Buscar en xmls_recibidos
    this.logger.debug('🔍 Paso 2: Buscando XML en xmls_recibidos...');
    this.logger.debug('Criterios de búsqueda:', {
      rfc_emisor: cfdiFinanciero.rfc_emisor,
      folio: cfdiFinanciero.folio,
      usuario_id: cfdiFinanciero.usuario_id
    });

    const xmlRecibido = await this.xmlRecibidoRepository
      .createQueryBuilder('xml')
      .where('xml.rfc_emisor = :rfcEmisor', { rfcEmisor: cfdiFinanciero.rfc_emisor })
      .andWhere('xml.folio = :folio', { folio: cfdiFinanciero.folio })
      .andWhere('xml.usuario_id = :usuarioId', { usuarioId: cfdiFinanciero.usuario_id })
      .getOne();

    if (!xmlRecibido) {
      this.logger.error('❌ No se encontró el XML en xmls_recibidos');
      
      // Intentar búsqueda alternativa solo por UUID
      this.logger.debug('🔍 Intentando búsqueda alternativa por UUID en XML...');
      const xmlAlternativo = await this.xmlRecibidoRepository
        .createQueryBuilder('xml')
        .where('xml.xml_completo LIKE :uuid', { uuid: `%${uuid}%` })
        .andWhere('xml.usuario_id = :usuarioId', { usuarioId: cfdiFinanciero.usuario_id })
        .getOne();

      if (!xmlAlternativo) {
        throw new Error('XML original no encontrado en xmls_recibidos');
      }

      this.logger.debug('✅ XML encontrado con búsqueda alternativa');
      
      return {
        success: true,
        xml: xmlAlternativo.xml_completo,
        filename: `${uuid}.xml`
      };
    }

    this.logger.debug('✅ XML encontrado, ID:', xmlRecibido.id);
    this.logger.debug('✅ Tamaño del XML:', xmlRecibido.xml_completo?.length || 0);

    if (!xmlRecibido.xml_completo) {
      throw new Error('El campo xml_completo está vacío');
    }

    this.logger.debug('=== FIN descargarXml EXITOSO ===');

    return {
      success: true,
      xml: xmlRecibido.xml_completo,
      filename: `${uuid}.xml`
    };

  } catch (error) {
    this.logger.error('=== ERROR en descargarXml ===');
    this.logger.error('Mensaje:', error.message);
    this.logger.error('Stack:', error.stack);
    throw error;
  }
}
/**
 * Genera PDF del CFDI (versión con múltiples estrategias de búsqueda)
 */
async descargarPdf(uuid: string, estilo: string = 'classic'): Promise<any> {
  this.logger.debug('=== INICIO descargarPdf ===');
  this.logger.debug('📥 UUID:', uuid);

  try {
    let cfdi = null;

    // Estrategia 1: Búsqueda exacta
    cfdi = await this.xmlFinancieroRepository.findOne({
      where: { folio_fiscal: uuid }
    });

    // Estrategia 2: Case-insensitive
    if (!cfdi) {
      cfdi = await this.xmlFinancieroRepository
        .createQueryBuilder('cfdi')
        .where('LOWER(cfdi.folio_fiscal) = LOWER(:uuid)', { uuid })
        .getOne();
    }

    // Estrategia 3: Sin guiones
    if (!cfdi) {
      const uuidSinGuiones = uuid.replace(/-/g, '');
      cfdi = await this.xmlFinancieroRepository
        .createQueryBuilder('cfdi')
        .where('REPLACE(LOWER(cfdi.folio_fiscal), \'-\', \'\') = :uuidSinGuiones', { 
          uuidSinGuiones: uuidSinGuiones.toLowerCase() 
        })
        .getOne();
    }

    // Estrategia 4: Búsqueda parcial (LIKE)
    if (!cfdi) {
      cfdi = await this.xmlFinancieroRepository
        .createQueryBuilder('cfdi')
        .where('cfdi.folio_fiscal LIKE :uuid', { uuid: `%${uuid}%` })
        .getOne();
    }

    if (!cfdi) {
      this.logger.error('❌ CFDI no encontrado con ninguna estrategia');
      throw new Error('CFDI no encontrado');
    }

    this.logger.debug('✅ CFDI encontrado:', cfdi.id);
    return await this.generarPdfDesdeCfdi(cfdi, estilo);

  } catch (error) {
    this.logger.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Método auxiliar para generar el PDF desde el objeto CFDI
 */
private async generarPdfDesdeCfdi(cfdi: any, estilo: string): Promise<any> {
  try {
    // 2. Leer el template HTML
    const templatesPath = path.join(process.cwd(), 'src', 'templates');
    const htmlPath = path.join(templatesPath, `cfdi-${estilo}.html`);

    if (!fs.existsSync(htmlPath)) {
      this.logger.error(`❌ Template no encontrado: ${htmlPath}`);
      throw new Error(`Template HTML no encontrado: cfdi-${estilo}.html`);
    }

    let templateHtml = fs.readFileSync(htmlPath, 'utf8');
    this.logger.debug('✅ Template HTML leído');

    // 3. Preparar logo
    const logoPath = path.join(templatesPath, 'logo.png');
    let logoDataUri: string;

    if (fs.existsSync(logoPath)) {
      const logoBase64 = fs.readFileSync(logoPath).toString('base64');
      logoDataUri = `data:image/png;base64,${logoBase64}`;
      this.logger.debug('✅ Logo encontrado');
    } else {
      // Placeholder transparente
      logoDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      this.logger.debug('⚠️ Logo no encontrado, usando placeholder');
    }

    // 4. Generar HTML de items/conceptos
    const conceptos = cfdi.conceptos_detalle || [];
    this.logger.debug(`📋 Conceptos: ${conceptos.length}`);
    
    const itemsHtml = conceptos.map((item: any) => {
      return `
        <tr>
          <td class="text-center">${item.cantidad || 1}</td>
          <td>${item.claveProdServ || 'N/A'}</td>
          <td>${item.descripcion || 'Sin descripción'}</td>
          <td class="text-right">$ ${Number(item.valorUnitario || 0).toFixed(2)}</td>
          <td class="text-right">$ ${Number(item.importe || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Si no hay conceptos, agregar un placeholder
    const itemsHtmlFinal = itemsHtml || `
      <tr>
        <td class="text-center">1</td>
        <td>N/A</td>
        <td>Producto o Servicio</td>
        <td class="text-right">$ ${Number(cfdi.sub_total || 0).toFixed(2)}</td>
        <td class="text-right">$ ${Number(cfdi.sub_total || 0).toFixed(2)}</td>
      </tr>
    `;

    // 5. Generar HTML de retenciones
    let retencionesHtml = '';
    if (cfdi.iva_retenido && cfdi.iva_retenido > 0) {
      retencionesHtml += `
        <div class="total-row">
          <span>IVA Retenido:</span>
          <span>$ ${Number(cfdi.iva_retenido).toFixed(2)}</span>
        </div>
      `;
    }
    if (cfdi.isr_retenido && cfdi.isr_retenido > 0) {
      retencionesHtml += `
        <div class="total-row">
          <span>ISR Retenido:</span>
          <span>$ ${Number(cfdi.isr_retenido).toFixed(2)}</span>
        </div>
      `;
    }

    // 6. Determinar tipo de documento
    const tipoDocumento = cfdi.tipo_comprobante === 'I' ? 'FACTURA - INGRESO' :
                         cfdi.tipo_comprobante === 'E' ? 'FACTURA - EGRESO' :
                         cfdi.tipo_comprobante === 'N' ? 'NÓMINA' :
                         cfdi.tipo_comprobante === 'P' ? 'PAGO' : 'COMPROBANTE';

    // 7. Reemplazar variables en el template
    let htmlFinal = templateHtml
      .replace('{{logo}}', logoDataUri)
      .replace('{{tipo_documento}}', tipoDocumento)
      .replace(/\{\{nombre_emisor\}\}/g, cfdi.nombre_emisor || 'Sin nombre')
      .replace(/\{\{rfc_emisor\}\}/g, cfdi.rfc_emisor || 'N/A')
      .replace(/\{\{regimen_fiscal_emisor\}\}/g, cfdi.regimen_fiscal_emisor || 'N/A')
      .replace(/\{\{lugar_expedicion\}\}/g, cfdi.lugar_expedicion || 'N/A')
      .replace(/\{\{serie\}\}/g, cfdi.serie || '')
      .replace(/\{\{folio\}\}/g, cfdi.folio || 'S/N')
      .replace(/\{\{fecha\}\}/g, format(new Date(cfdi.fecha), 'dd/MM/yyyy HH:mm:ss'))
      .replace(/\{\{nombre_receptor\}\}/g, cfdi.nombre_receptor || 'Sin nombre')
      .replace(/\{\{rfc_receptor\}\}/g, cfdi.rfc_receptor || 'N/A')
      .replace(/\{\{uso_cfdi\}\}/g, cfdi.uso_cfdi || 'N/A')
      .replace(/\{\{metodo_pago\}\}/g, cfdi.metodo_pago || 'N/A')
      .replace(/\{\{forma_pago\}\}/g, cfdi.forma_pago || 'N/A')
      .replace(/\{\{moneda\}\}/g, cfdi.moneda || 'MXN')
      .replace('{{items}}', itemsHtmlFinal)
      .replace('{{subtotal}}', Number(cfdi.sub_total || 0).toFixed(2))
      .replace('{{iva_trasladado}}', Number(cfdi.iva_trasladado || 0).toFixed(2))
      .replace('{{retenciones_html}}', retencionesHtml)
      .replace(/\{\{total\}\}/g, Number(cfdi.total || 0).toFixed(2))
      .replace(/\{\{folio_fiscal\}\}/g, cfdi.folio_fiscal)
      .replace('{{fecha_generacion}}', format(new Date(), 'dd/MM/yyyy HH:mm:ss'));

    this.logger.debug('✅ HTML generado, iniciando Puppeteer...');

    // 8. Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setContent(htmlFinal, {
      waitUntil: 'networkidle0',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    await browser.close();

    this.logger.debug('✅ PDF generado, tamaño:', pdfBuffer.length);

    return {
      success: true,
      pdf: Buffer.from(pdfBuffer),
      filename: `${cfdi.folio_fiscal}.pdf`
    };

  } catch (error) {
    this.logger.error('❌ Error en generarPdfDesdeCfdi:', error.message);
    this.logger.error('Stack:', error.stack);
    throw error;
  }
}
}