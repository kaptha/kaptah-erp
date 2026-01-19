import * as xmlbuilder from 'xmlbuilder';
import * as fs from 'fs';
import * as path from 'path';
export class XmlBuilder {
  private static formatSatDateTime(): string {
    const now = new Date();
    return `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}T` +
      `${String(now.getHours()).padStart(2, '0')}:` +
      `${String(now.getMinutes()).padStart(2, '0')}:` +
      `${String(now.getSeconds()).padStart(2, '0')}`;
  }
  static build(rootElement: string, data: any): string {
    try {
      const root = xmlbuilder.create(rootElement, {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: true
      })
      .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
      .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
      .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd');

      // Añadir atributos básicos
      root.att('Version', '4.0')
          .att('Serie', data.serie || '')
          .att('Folio', data.folio || '')
          .att('Fecha', data.fecha)
          .att('Sello', data.sello || '')
          .att('NoCertificado', data.noCertificado || '')
          .att('Certificado', data.certificado || '')
          .att('SubTotal', data.subTotal)
          .att('Moneda', data.moneda)
          .att('Total', data.total)
          .att('TipoDeComprobante', data.tipoDeComprobante)
          .att('Exportacion', data.exportacion)
          .att('LugarExpedicion', data.lugarExpedicion);

      // Añadir emisor
      if (data.emisor) {
        root.ele('cfdi:Emisor')
            .att('Rfc', data.emisor.rfc)
            .att('Nombre', data.emisor.nombre)
            .att('RegimenFiscal', data.emisor.regimenFiscal);
      }

      // Añadir receptor
      if (data.receptor) {
        root.ele('cfdi:Receptor')
            .att('Rfc', data.receptor.rfc)
            .att('Nombre', data.receptor.nombre)
            .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
            .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
            .att('UsoCFDI', data.receptor.usoCFDI);
      }

      // Añadir conceptos
      if (data.conceptos && data.conceptos.length > 0) {
        const conceptos = root.ele('cfdi:Conceptos');
        
        data.conceptos.forEach(concepto => {
          const conceptoElement = conceptos.ele('cfdi:Concepto')
            .att('ClaveProdServ', concepto.claveProdServ)
            .att('Cantidad', concepto.cantidad)
            .att('ClaveUnidad', concepto.claveUnidad)
            .att('Descripcion', concepto.descripcion)
            .att('ValorUnitario', concepto.valorUnitario)
            .att('Importe', concepto.importe)
            .att('ObjetoImp', concepto.objetoImp);

          // Añadir impuestos del concepto si existen
          if (concepto.impuestos) {
            const impuestos = conceptoElement.ele('cfdi:Impuestos');
            
            if (concepto.impuestos.traslados) {
              const traslados = impuestos.ele('cfdi:Traslados');
              concepto.impuestos.traslados.forEach(traslado => {
                traslados.ele('cfdi:Traslado')
                  .att('Base', traslado.base)
                  .att('Impuesto', traslado.impuesto)
                  .att('TipoFactor', traslado.tipoFactor)
                  .att('TasaOCuota', traslado.tasaOCuota)
                  .att('Importe', traslado.importe);
              });
            }
          }
        });
      }

      // Convertir a string y retornar
      return root.end({ pretty: true });
    } catch (error) {
      throw new Error(`Error building XML: ${error.message}`);
    }
  }
  static buildIngresoCfdi(data: any): string {
    // Calcular totales
    const subtotal = data.conceptos.reduce((sum, c) => sum + c.importe, 0);
    const totalImpuestosTrasladados = data.conceptos.reduce((sum, c) => 
      sum + (c.impuestos?.traslados?.[0]?.importe || 0), 0);
    const total = subtotal + totalImpuestosTrasladados;

    const root = xmlbuilder.create('cfdi:Comprobante', {
      version: '1.0',
      encoding: 'UTF-8',
    })
    .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
    .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd')
    .att('Version', '4.0')
    .att('Serie', data.serie)
    .att('Folio', data.folio)
    .att('Fecha', XmlBuilder.formatSatDateTime())
    .att('Sello', data.sello || 'ZmKUhqxP3/xPOmVz+vsHX/yGjW3gYLZEpbc5eEFY4w0RH62OoLhgwP1/Ob29CLfU2tN+36p+G4l8La8XOuC12uD0VSxz+6tvJ4Gkh3cmC4NcLOHuy3YPK64nMFEyfTuoi6xlBO4HopTzqL+PeEO2DhAOiVGmyVlRXq8cHNG2hGfvs15QhFeHFp38FZ4/gaOLN1MKbw+PXIOAkt8TLnAWPm2afcOYL9T2Z1n8rRlaLwh0I3FsimPaXIG+4LkpKSHEP6gSBzuZKlm3YBTcr6FbtDMsCuzd1eNrAa02YIltpo0mqmuG0aKCOcdjhx8+/rXP4YC9hX6PE6EQuvJSJ4tPUw==')
    .att('NoCertificado', data.noCertificado || '30001000000500003431')
    .att('Certificado', data.certificado || 'MIIFrTCCA5WgAwIBAgIUMzAwMDEwMDAwMDA1MDAwMDM0MzEwDQYJKoZIhvcNAQELBQAwggErMQ8wDQYDVQQDDAZBQyBVQVQxLjAsBgNVBAoMJVNFUlZJQ0lPIERFIEFETUlOSVNUUkFDSU9OIFRSSUJVVEFSSUExGjAYBgNVBAsMEVNBVC1JRVMgQXV0aG9yaXR5MSgwJgYJKoZIhvcNAQkBFhlvc2Nhci5tYXJ0aW5lekBzYXQuZ29iLm14MR0wGwYDVQQJDBQzcmEgY2VycmFkYSBkZSBjYWxpejEOMAwGA1UEEQwFMDYzNzAxCzAJBgNVBAYTAk1YMRkwFwYDVQQIDBBDSVVEQUQgREUgTUVYSUNPMREwDwYDVQQHDAhDT1lPQUNBTjERMA8GA1UELRMIMi41LjQuNDUxJTAjBgkqhkiG9w0BCQITFnJlc3BvbnNhYmxlOiBBQ0RNQS1TQVQwHhcNMjMwNTE4MTI0MjE0WhcNMjcwNTE4MTI0MjE0WjCB1DEmMCQGA1UEAxQdSEVSUkVSSUEgJiBFTEVDVFJJQ09TIFMgREUgQ1YxJjAkBgNVBCkUHUhFUlJFUklBICYgRUxFQ1RSSUNPUyBTIERFIENWMSYwJAYDVQQKFB1IRVJSRVJJQSAmIEVMRUNUUklDT1MgUyBERSBDVjElMCMGA1UELRQcSCZFOTUxMTI4NDY5IC8gVkFEQTgwMDkyN0RKMzEeMBwGA1UEBRMVIC8gVkFEQTgwMDkyN0hTUlNSTDA1MRMwEQYDVQQLEwpTdWN1cnNhbCAxMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqHjtcPT4v+K0jXrhGsx+8sSS1eJ9LxCnY3/qaodXPFEik04VtM6N5as4ECs88L5zSkg182dOynfOPWAtH8Iy4Tqs39WNvvOeyIAUSvcKBU3NJtJDG93z+Eb3ExIw6NJ1fVivLtFFxVHDiJR4aZMzWixqt+tHyaOdoJ4s1qEezDZRidn0LJGgi5f+Zi6wYh51IlhJipiH0b1r/tl8tdMMxpgIr2rHGKodg+OtT/JC1xZSqpsLWJrXobTWGIuzZTVvAMIqyYzyoQwhE7hF/gWwnrcQESZWiPdpMgxhTGtTId28lAVePY+i5fi0VkotqrMf7MbtFWXqrTzw+4x084l0KQIDAQABox0wGzAMBgNVHRMBAf8EAjAAMAsGA1UdDwQEAwIGwDANBgkqhkiG9w0BAQsFAAOCAgEAdmYSUf2x1PaZ8lV2/xteUmmEBNULVIlr1l9l9RId111iymbJN8SrQmLh/8fvR8mR02iMOSQHI6330krcv8Xh/fs4U237kT62jfeezE9ZMtfbKnAxWbAJXyA6sAz2MbwJblLyA/m/NjuJirVEtTnOK8ARNrUwg2Mr1yKWjH3yi1Nx5qksYDvki7082hxA0EV7HxF6xoMFO6EGStdAoHd3m4T8VQ2hz392u35TiDair7CXA02eue7RIQLvT9BdJl2AcDdo2hLe8Pok5+HLJkLOre2akwoMttif8PZjAxIjwcecw7O+l4BOxeO8g5HGxjgvI9YMADptQxh6wh+uQhM2SFtVzM9un8JCIuxTzFA93yvoPswuZiMMMoDIv4Qa6mkI6I+BuaAVL5k6v8qSe9+EDSsNgdhIX4sg0Vyf5INxCv1uhqXcvfK55x9m0KNC2+pQR3aOKjwhFxoOqgsQ+shrhVU9MnYh18vKRwMcwJ+JNG9weEtpp+IP3VRg8ymx6YZaH3aUya8XGKefGOJvCDI0rP4CRJ31U+hPEj+RslE5qxpLHAYxvUG+0lN9gPreLXignsj1cIMlXeFjueqqmUxUYrXJpK+pF2TZId6INxHtBx2VUuDu/lvmkdKu0uqfE+LKwF9tgROF4ziI++RckYLscBmYFV4ZikhEfhkPnNYSGgc=')
    .att('FormaPago', data.formaPago)
    .att('SubTotal', subtotal.toFixed(2))
    .att('Moneda', data.moneda)
    .att('TipoCambio', data.tipoCambio)
    .att('Total', total.toFixed(2))
    .att('TipoDeComprobante', 'I')
    .att('Exportacion', data.exportacion)
    .att('MetodoPago', data.metodoPago)
    .att('LugarExpedicion', data.lugarExpedicion);

    // Agregar CfdiRelacionados si existen
    if (data.cfdiRelacionados?.length > 0) {
      data.cfdiRelacionados.forEach(rel => {
        const relacionados = root.ele('cfdi:CfdiRelacionados')
          .att('TipoRelacion', rel.tipoRelacion);
        
        rel.uuid.forEach(uuid => {
          relacionados.ele('cfdi:CfdiRelacionado')
            .att('UUID', uuid);
        });
      });
    }

    // Agregar Emisor
    root.ele('cfdi:Emisor')
      .att('Rfc', data.emisor.rfc)
      .att('Nombre', data.emisor.nombre)
      .att('RegimenFiscal', data.emisor.regimenFiscal);

    // Agregar Receptor
    root.ele('cfdi:Receptor')
      .att('Rfc', data.receptor.rfc)
      .att('Nombre', data.receptor.nombre)
      .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
      .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
      .att('UsoCFDI', data.receptor.usoCFDI);

    // Agregar Conceptos
    const conceptos = root.ele('cfdi:Conceptos');
    data.conceptos.forEach(concepto => {
      const conceptoEle = conceptos.ele('cfdi:Concepto')
        .att('ClaveProdServ', concepto.claveProdServ)
        .att('Cantidad', concepto.cantidad)
        .att('ClaveUnidad', concepto.claveUnidad)
        .att('Unidad', concepto.unidad)
        .att('Descripcion', concepto.descripcion)
        .att('ValorUnitario', concepto.valorUnitario.toFixed(2))
        .att('Importe', concepto.importe.toFixed(2))
        .att('ObjetoImp', concepto.objetoImp);

      if (concepto.impuestos?.traslados) {
        const impuestos = conceptoEle.ele('cfdi:Impuestos');
        const traslados = impuestos.ele('cfdi:Traslados');
        
        concepto.impuestos.traslados.forEach(traslado => {
          traslados.ele('cfdi:Traslado')
            .att('Base', traslado.base.toFixed(2))
            .att('Impuesto', traslado.impuesto)
            .att('TipoFactor', traslado.tipoFactor)
            .att('TasaOCuota', traslado.tasaOCuota.toFixed(6))
            .att('Importe', traslado.importe.toFixed(2));
        });
      }
    });

    // Agregar Impuestos globales
    if (totalImpuestosTrasladados > 0) {
      const impuestos = root.ele('cfdi:Impuestos')
        .att('TotalImpuestosTrasladados', totalImpuestosTrasladados.toFixed(2));
      
      const traslados = impuestos.ele('cfdi:Traslados');
      const tasas = new Map();
      
      // Agrupar traslados por tipo de impuesto y tasa
      data.conceptos.forEach(concepto => {
        concepto.impuestos?.traslados?.forEach(traslado => {
          const key = `${traslado.impuesto}_${traslado.tasaOCuota}_${traslado.tipoFactor}`;
          const current = tasas.get(key) || { base: 0, importe: 0 };
          tasas.set(key, {
            base: current.base + traslado.base,
            importe: current.importe + traslado.importe,
            impuesto: traslado.impuesto,
            tipoFactor: traslado.tipoFactor,
            tasaOCuota: traslado.tasaOCuota
          });
        });
      });

      // Agregar cada traslado único
      tasas.forEach(traslado => {
        traslados.ele('cfdi:Traslado')
          .att('Base', traslado.base.toFixed(2))
          .att('Impuesto', traslado.impuesto)
          .att('TipoFactor', traslado.tipoFactor)
          .att('TasaOCuota', traslado.tasaOCuota.toFixed(6))
          .att('Importe', traslado.importe.toFixed(2));
      });
    }

    return root.end({ pretty: true });
  }
  static buildNominaCfdi(data: any): string {
    const totalPercepciones = Number(data.nomina.totalPercepciones).toFixed(2);
    const totalDeducciones = Number(data.nomina.totalDeducciones).toFixed(2);
    const total = (Number(totalPercepciones) - Number(totalDeducciones)).toFixed(2);

    const root = xmlbuilder.create('cfdi:Comprobante', {
      version: '1.0',
      encoding: 'UTF-8',
    })
    .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
    .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    .att('xmlns:nomina12', 'http://www.sat.gob.mx/nomina12')
    .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd')
    .att('Version', '4.0')
    .att('Serie', data.serie)
    .att('Folio', data.folio)
    .att('Fecha', XmlBuilder.formatSatDateTime())
    .att('SubTotal', totalPercepciones)
    .att('Descuento', totalDeducciones)
    .att('Moneda', data.moneda)
    .att('Total', total)
    .att('TipoDeComprobante', 'N')
    .att('Exportacion', '01')
    .att('MetodoPago', data.metodoPago)
    .att('LugarExpedicion', data.receptor.domicilioFiscalReceptor);

    // Emisor
    root.ele('cfdi:Emisor')
      .att('Rfc', data.emisor.rfc)
      .att('Nombre', data.emisor.nombre)
      .att('RegimenFiscal', data.emisor.regimenFiscal);

    // Receptor
    root.ele('cfdi:Receptor')
      .att('Rfc', data.receptor.rfc)
      .att('Nombre', data.receptor.nombre)
      .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
      .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
      .att('UsoCFDI', data.receptor.usoCFDI);

    // Conceptos
    const conceptos = root.ele('cfdi:Conceptos');
    conceptos.ele('cfdi:Concepto')
      .att('ClaveProdServ', '84111505')
      .att('Cantidad', '1')
      .att('ClaveUnidad', 'ACT')
      .att('Descripcion', 'Pago de nómina')
      .att('ValorUnitario', data.nomina.totalPercepciones)
      .att('Importe', data.nomina.totalPercepciones)
      .att('Descuento', data.nomina.totalDeducciones)
      .att('ObjetoImp', '01');

    // Complemento de Nómina
    const complemento = root.ele('cfdi:Complemento');
    const nomina = complemento.ele('nomina12:Nomina')
      .att('Version', '1.2')
      .att('TipoNomina', data.nomina.tipoNomina)
      .att('FechaPago', data.nomina.fechaPago)
      .att('FechaInicialPago', data.nomina.fechaInicialPago)
      .att('FechaFinalPago', data.nomina.fechaFinalPago)
      .att('NumDiasPagados', data.nomina.numDiasPagados)
      .att('TotalPercepciones', Number(data.nomina.totalPercepciones).toFixed(2))
      .att('TotalDeducciones', Number(data.nomina.totalDeducciones).toFixed(2))
      .att('TotalOtrosPagos', Number(data.nomina.totalOtrosPagos).toFixed(2));

    // Emisor de Nómina
    nomina.ele('nomina12:Emisor')
      .att('RegistroPatronal', data.emisor.registroPatronal);

    // Receptor de Nómina
    nomina.ele('nomina12:Receptor')
      .att('Curp', data.receptor.curp)
      .att('NumSeguridadSocial', data.receptor.numSeguridadSocial)
      .att('FechaInicioRelLaboral', data.receptor.fechaInicioRelLaboral)
      .att('Antigüedad', data.receptor.antiguedad)
      .att('TipoContrato', data.receptor.tipoContrato)
      .att('Sindicalizado', data.receptor.sindicalizado)
      .att('TipoJornada', data.receptor.tipoJornada)
      .att('TipoRegimen', data.receptor.tipoRegimen)
      .att('NumEmpleado', data.receptor.numEmpleado)
      .att('Departamento', data.receptor.departamento)
      .att('Puesto', data.receptor.puesto)
      .att('RiesgoPuesto', data.receptor.riesgoPuesto)
      .att('PeriodicidadPago', data.receptor.periodicidadPago)
      .att('Banco', data.receptor.banco)
      .att('CuentaBancaria', data.receptor.cuentaBancaria)
      .att('SalarioBaseCotApor', Number(data.receptor.salarioBaseCotApor).toFixed(2))
      .att('SalarioDiarioIntegrado', Number(data.receptor.salarioDiarioIntegrado).toFixed(2))
      .att('ClaveEntFed', data.receptor.claveEntFed);

    // Percepciones
    if (data.nomina.percepciones?.length > 0) {
      const totalSeparacionIndemnizacion = data.nomina.separacionIndemnizacion?.totalPagado || 0;
      const totalSueldos = data.nomina.percepciones.reduce((sum, p) => 
        sum + Number(p.importeGravado) + Number(p.importeExento), 0);
      const totalGravado = data.nomina.percepciones.reduce((sum, p) => 
        sum + Number(p.importeGravado), 0);
      const totalExento = data.nomina.percepciones.reduce((sum, p) => 
        sum + Number(p.importeExento), 0);

      const percepciones = nomina.ele('nomina12:Percepciones')
        .att('TotalSueldos', totalSueldos.toFixed(2))
        .att('TotalSeparacionIndemnizacion', totalSeparacionIndemnizacion.toFixed(2))
        .att('TotalGravado', totalGravado.toFixed(2))
        .att('TotalExento', totalExento.toFixed(2));

      data.nomina.percepciones.forEach(percepcion => {
        const percepcionEle = percepciones.ele('nomina12:Percepcion')
          .att('TipoPercepcion', percepcion.tipoPercepcion)
          .att('Clave', percepcion.clave)
          .att('Concepto', percepcion.concepto)
          .att('ImporteGravado', Number(percepcion.importeGravado).toFixed(2))
          .att('ImporteExento', Number(percepcion.importeExento).toFixed(2));

        if (percepcion.horasExtra) {
          percepcionEle.ele('nomina12:HorasExtra')
            .att('Dias', percepcion.horasExtra.dias)
            .att('TipoHoras', percepcion.horasExtra.tipoHoras)
            .att('HorasExtra', percepcion.horasExtra.horasExtra)
            .att('ImportePagado', Number(percepcion.horasExtra.importePagado).toFixed(2));
        }
      });

      // Agregar SeparacionIndemnizacion si existe
      if (data.nomina.separacionIndemnizacion) {
        percepciones.ele('nomina12:SeparacionIndemnizacion')
          .att('TotalPagado', Number(data.nomina.separacionIndemnizacion.totalPagado).toFixed(2))
          .att('NumAñosServicio', data.nomina.separacionIndemnizacion.numAñosServicio)
          .att('UltimoSueldoMensOrd', Number(data.nomina.separacionIndemnizacion.ultimoSueldoMensOrd).toFixed(2))
          .att('IngresoAcumulable', Number(data.nomina.separacionIndemnizacion.ingresoAcumulable).toFixed(2))
          .att('IngresoNoAcumulable', Number(data.nomina.separacionIndemnizacion.ingresoNoAcumulable).toFixed(2));
      }
    }

    // Deducciones
    if (data.nomina.deducciones?.length > 0) {
      const totalImpuestosRetenidos = data.nomina.deducciones
        .filter(d => d.tipoDeduccion === '002')
        .reduce((sum, d) => sum + Number(d.importe), 0);
      
      const totalOtrasDeducciones = data.nomina.deducciones
        .filter(d => d.tipoDeduccion !== '002')
        .reduce((sum, d) => sum + Number(d.importe), 0);

      const deducciones = nomina.ele('nomina12:Deducciones')
        .att('TotalImpuestosRetenidos', totalImpuestosRetenidos.toFixed(2))
        .att('TotalOtrasDeducciones', totalOtrasDeducciones.toFixed(2));

      data.nomina.deducciones.forEach(deduccion => {
        deducciones.ele('nomina12:Deduccion')
          .att('TipoDeduccion', deduccion.tipoDeduccion)
          .att('Clave', deduccion.clave)
          .att('Concepto', deduccion.concepto)
          .att('Importe', Number(deduccion.importe).toFixed(2));
      });
    }

    // Otros Pagos
    if (data.nomina.otrosPagos?.length > 0) {
      const otrosPagos = nomina.ele('nomina12:OtrosPagos');

      data.nomina.otrosPagos.forEach(otroPago => {
        const otroPagoEle = otrosPagos.ele('nomina12:OtroPago')
          .att('TipoOtroPago', otroPago.tipoOtroPago)
          .att('Clave', otroPago.clave)
          .att('Concepto', otroPago.concepto)
          .att('Importe', otroPago.importe);

        if (otroPago.subsidioAlEmpleo) {
          otroPagoEle.ele('nomina12:SubsidioAlEmpleo')
            .att('SubsidioCausado', otroPago.subsidioAlEmpleo.subsidioCausado);
        }

        if (otroPago.compensacionSaldosAFavor) {
          otroPagoEle.ele('nomina12:CompensacionSaldosAFavor')
            .att('SaldoAFavor', otroPago.compensacionSaldosAFavor.saldoAFavor)
            .att('Año', otroPago.compensacionSaldosAFavor.año)
            .att('RemanenteSalFav', otroPago.compensacionSaldosAFavor.remanenteSalFav);
        }
      });
    }

    // Incapacidades
    if (data.nomina.incapacidades?.length > 0) {
      const incapacidades = nomina.ele('nomina12:Incapacidades');

      data.nomina.incapacidades.forEach(incapacidad => {
        incapacidades.ele('nomina12:Incapacidad')
          .att('DiasIncapacidad', incapacidad.diasIncapacidad)
          .att('TipoIncapacidad', incapacidad.tipoIncapacidad)
          .att('ImporteMonetario', incapacidad.importeMonetario);
      });
    }

    return root.end({ pretty: true });
  }
  static buildPagoCfdi(data: any): string {
    const root = xmlbuilder.create('cfdi:Comprobante', {
      version: '1.0',
      encoding: 'UTF-8',
    })
    .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
    .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    .att('xmlns:pago20', 'http://www.sat.gob.mx/Pagos20')
    .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd')
    .att('Version', '4.0')
    .att('Serie', data.serie)
    .att('Folio', data.folio)
    .att('Fecha', XmlBuilder.formatSatDateTime())
    .att('SubTotal', '0')
    .att('Moneda', 'XXX')
    .att('Total', '0')
    .att('TipoDeComprobante', 'P')
    .att('Exportacion', data.exportacion)
    .att('LugarExpedicion', data.receptor.domicilioFiscalReceptor);

    // Emisor
    root.ele('cfdi:Emisor')
      .att('Rfc', data.emisor.rfc)
      .att('Nombre', data.emisor.nombre)
      .att('RegimenFiscal', data.emisor.regimenFiscal);

    // Receptor
    root.ele('cfdi:Receptor')
      .att('Rfc', data.receptor.rfc)
      .att('Nombre', data.receptor.nombre)
      .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
      .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
      .att('UsoCFDI', data.receptor.usoCFDI);

    // Conceptos
    const conceptos = root.ele('cfdi:Conceptos');
    conceptos.ele('cfdi:Concepto')
      .att('ClaveProdServ', '84111506')
      .att('Cantidad', '1')
      .att('ClaveUnidad', 'ACT')
      .att('Descripcion', 'Pago')
      .att('ValorUnitario', '0')
      .att('Importe', '0')
      .att('ObjetoImp', '01');

    // Complemento de Pagos
    const complemento = root.ele('cfdi:Complemento');
    const pagos = complemento.ele('pago20:Pagos')
      .att('Version', '2.0');

    // Totales
    pagos.ele('pago20:Totales')
      .att('TotalTrasladosBaseIVA16', Number(data.pagos.totales.totalTrasladosBaseIVA16).toFixed(2))
      .att('TotalTrasladosImpuestoIVA16', Number(data.pagos.totales.totalTrasladosImpuestoIVA16).toFixed(2))
      .att('TotalTrasladosBaseIVA8', Number(data.pagos.totales.totalTrasladosBaseIVA8).toFixed(2))
      .att('TotalTrasladosImpuestoIVA8', Number(data.pagos.totales.totalTrasladosImpuestoIVA8).toFixed(2))
      .att('TotalTrasladosBaseIVA0', Number(data.pagos.totales.totalTrasladosBaseIVA0).toFixed(2))
      .att('TotalTrasladosImpuestoIVA0', Number(data.pagos.totales.totalTrasladosImpuestoIVA0).toFixed(2))
      .att('TotalTrasladosBaseIVAExento', Number(data.pagos.totales.totalTrasladosBaseIVAExento).toFixed(2))
      .att('MontoTotalPagos', Number(data.pagos.totales.montoTotalPagos).toFixed(2));

    // Pagos
    data.pagos.pago.forEach((pago: any) => {
      const pagoNode = pagos.ele('pago20:Pago')
        .att('FechaPago', pago.fechaPago)
        .att('FormaDePagoP', pago.formaDePagoP)
        .att('MonedaP', pago.monedaP)
        .att('TipoCambioP', Number(pago.tipoCambioP).toFixed(6))
        .att('Monto', Number(pago.monto).toFixed(2));

      if (pago.rfcEmisorCtaOrd) {
        pagoNode.att('RfcEmisorCtaOrd', pago.rfcEmisorCtaOrd);
      }
      if (pago.nomBancoOrdExt) {
        pagoNode.att('NomBancoOrdExt', pago.nomBancoOrdExt);
      }
      if (pago.ctaOrdenante) {
        pagoNode.att('CtaOrdenante', pago.ctaOrdenante);
      }
      if (pago.rfcEmisorCtaBen) {
        pagoNode.att('RfcEmisorCtaBen', pago.rfcEmisorCtaBen);
      }
      if (pago.ctaBeneficiario) {
        pagoNode.att('CtaBeneficiario', pago.ctaBeneficiario);
      }

      // Documentos Relacionados
      pago.documentosRelacionados.forEach((doc: any) => {
        const docNode = pagoNode.ele('pago20:DoctoRelacionado')
          .att('IdDocumento', doc.idDocumento)
          .att('MonedaDR', doc.monedaDR)
          .att('NumParcialidad', doc.numParcialidad)
          .att('ImpSaldoAnt', Number(doc.impSaldoAnt).toFixed(2))
          .att('ImpPagado', Number(doc.impPagado).toFixed(2))
          .att('ImpSaldoInsoluto', Number(doc.impSaldoInsoluto).toFixed(2))
          .att('ObjetoImpDR', doc.objetoImpDR);

        if (doc.serie) docNode.att('Serie', doc.serie);
        if (doc.folio) docNode.att('Folio', doc.folio);
        if (doc.equivalenciaDR) docNode.att('EquivalenciaDR', Number(doc.equivalenciaDR).toFixed(6));

        // Impuestos del documento relacionado
        if (doc.impuestos?.traslados) {
          const impuestosDR = docNode.ele('pago20:ImpuestosDR');
          const trasladosDR = impuestosDR.ele('pago20:TrasladosDR');

          doc.impuestos.traslados.forEach((traslado: any) => {
            trasladosDR.ele('pago20:TrasladoDR')
              .att('BaseDR', Number(traslado.baseDR).toFixed(2))
              .att('ImpuestoDR', traslado.impuestoDR)
              .att('TipoFactorDR', traslado.tipoFactorDR)
              .att('TasaOCuotaDR', Number(traslado.tasaOCuotaDR).toFixed(6))
              .att('ImporteDR', Number(traslado.importeDR).toFixed(2));
          });
        }
      });

      // Impuestos del pago
      if (pago.impuestosP?.trasladosP) {
        const impuestosP = pagoNode.ele('pago20:ImpuestosP');
        const trasladosP = impuestosP.ele('pago20:TrasladosP');

        pago.impuestosP.trasladosP.forEach((traslado: any) => {
          trasladosP.ele('pago20:TrasladoP')
            .att('BaseP', Number(traslado.baseP).toFixed(6))
            .att('ImpuestoP', traslado.impuestoP)
            .att('TipoFactorP', traslado.tipoFactorP)
            .att('TasaOCuotaP', Number(traslado.tasaOCuotaP).toFixed(6))
            .att('ImporteP', Number(traslado.importeP).toFixed(6));
        });
      }
    });

    return root.end({ pretty: true });
}
static buildEgresoCfdi(data: any): string {
  // Calcular totales
  const subtotal = data.conceptos.reduce((sum, c) => sum + c.importe, 0);
  const totalImpuestosTrasladados = data.conceptos.reduce((sum, c) => 
    sum + (c.impuestos?.traslados?.[0]?.importe || 0), 0);
  const total = subtotal + totalImpuestosTrasladados;

  const root = xmlbuilder.create('cfdi:Comprobante', {
    version: '1.0',
    encoding: 'UTF-8',
  })
  .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
  .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
  .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd')
  .att('Version', '4.0')
  .att('Serie', data.serie)
  .att('Folio', data.folio)
  .att('Fecha', XmlBuilder.formatSatDateTime())
  .att('SubTotal', subtotal.toFixed(2))
  .att('Moneda', data.moneda)
  .att('Total', total.toFixed(2))
  .att('TipoDeComprobante', 'E')
  .att('Exportacion', data.exportacion)
  .att('LugarExpedicion', data.lugarExpedicion);

  // CfdiRelacionados (obligatorio para CFDI de egreso)
  if (data.cfdiRelacionados) {
    const relacionados = root.ele('cfdi:CfdiRelacionados')
      .att('TipoRelacion', data.cfdiRelacionados.tipoRelacion);
    
    data.cfdiRelacionados.uuid.forEach(uuid => {
      relacionados.ele('cfdi:CfdiRelacionado')
        .att('UUID', uuid);
    });
  }

  // Emisor
  root.ele('cfdi:Emisor')
    .att('Rfc', data.emisor.rfc)
    .att('Nombre', data.emisor.nombre)
    .att('RegimenFiscal', data.emisor.regimenFiscal);

  // Receptor
  root.ele('cfdi:Receptor')
    .att('Rfc', data.receptor.rfc)
    .att('Nombre', data.receptor.nombre)
    .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
    .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
    .att('UsoCFDI', data.receptor.usoCFDI);

  // Conceptos
  const conceptos = root.ele('cfdi:Conceptos');
  data.conceptos.forEach(concepto => {
    const conceptoEle = conceptos.ele('cfdi:Concepto')
      .att('ClaveProdServ', concepto.claveProdServ)
      .att('Cantidad', concepto.cantidad)
      .att('ClaveUnidad', concepto.claveUnidad)
      .att('Descripcion', concepto.descripcion)
      .att('ValorUnitario', concepto.valorUnitario.toFixed(2))
      .att('Importe', concepto.importe.toFixed(2))
      .att('ObjetoImp', concepto.objetoImp);

    // Impuestos por concepto
    if (concepto.impuestos?.traslados) {
      const impuestos = conceptoEle.ele('cfdi:Impuestos');
      const traslados = impuestos.ele('cfdi:Traslados');
      
      concepto.impuestos.traslados.forEach(traslado => {
        traslados.ele('cfdi:Traslado')
          .att('Base', traslado.base.toFixed(2))
          .att('Impuesto', traslado.impuesto)
          .att('TipoFactor', traslado.tipoFactor)
          .att('TasaOCuota', traslado.tasaOCuota.toFixed(6))
          .att('Importe', traslado.importe.toFixed(2));
      });
    }
  });

  // Impuestos globales
  if (totalImpuestosTrasladados > 0) {
    const impuestos = root.ele('cfdi:Impuestos')
      .att('TotalImpuestosTrasladados', totalImpuestosTrasladados.toFixed(2));
    
    const traslados = impuestos.ele('cfdi:Traslados');
    const tasas = new Map();
    
    data.conceptos.forEach(concepto => {
      concepto.impuestos?.traslados?.forEach(traslado => {
        const key = `${traslado.impuesto}_${traslado.tasaOCuota}_${traslado.tipoFactor}`;
        const current = tasas.get(key) || { base: 0, importe: 0 };
        tasas.set(key, {
          base: current.base + traslado.base,
          importe: current.importe + traslado.importe,
          impuesto: traslado.impuesto,
          tipoFactor: traslado.tipoFactor,
          tasaOCuota: traslado.tasaOCuota
        });
      });
    });

    tasas.forEach(traslado => {
      traslados.ele('cfdi:Traslado')
        .att('Base', traslado.base.toFixed(2))
        .att('Impuesto', traslado.impuesto)
        .att('TipoFactor', traslado.tipoFactor)
        .att('TasaOCuota', traslado.tasaOCuota.toFixed(6))
        .att('Importe', traslado.importe.toFixed(2));
    });
  }

  return root.end({ pretty: true });
}

static buildTrasladoCfdi(data: any): string {
  const root = xmlbuilder.create('cfdi:Comprobante', {
    version: '1.0',
    encoding: 'UTF-8',
  })
  .att('xmlns:cfdi', 'http://www.sat.gob.mx/cfd/4')
  .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
  .att('xmlns:cartaporte20', 'http://www.sat.gob.mx/CartaPorte20')
  .att('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte20 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte20.xsd')
  .att('Version', '4.0')
  .att('Serie', data.serie)
  .att('Folio', data.folio)
  .att('Fecha', XmlBuilder.formatSatDateTime())
  .att('SubTotal', '0')
  .att('Moneda', data.moneda)
  .att('Total', '0')
  .att('TipoDeComprobante', 'T')
  .att('Exportacion', data.exportacion)
  .att('LugarExpedicion', data.lugarExpedicion);

  // Emisor
  root.ele('cfdi:Emisor')
    .att('Rfc', data.emisor.rfc)
    .att('Nombre', data.emisor.nombre)
    .att('RegimenFiscal', data.emisor.regimenFiscal);

  // Receptor
  root.ele('cfdi:Receptor')
    .att('Rfc', data.receptor.rfc)
    .att('Nombre', data.receptor.nombre)
    .att('DomicilioFiscalReceptor', data.receptor.domicilioFiscalReceptor)
    .att('RegimenFiscalReceptor', data.receptor.regimenFiscalReceptor)
    .att('UsoCFDI', data.receptor.usoCFDI);

  // Conceptos para traslado
  const conceptos = root.ele('cfdi:Conceptos');
  data.conceptos.forEach(concepto => {
    conceptos.ele('cfdi:Concepto')
      .att('ClaveProdServ', concepto.claveProdServ)
      .att('Cantidad', concepto.cantidad)
      .att('ClaveUnidad', concepto.claveUnidad)
      .att('Descripcion', concepto.descripcion)
      .att('ValorUnitario', '0')
      .att('Importe', '0')
      .att('ObjetoImp', '01');
  });

  // Complemento Carta Porte si existe
  if (data.cartaPorte) {
    const complemento = root.ele('cfdi:Complemento');
    const cartaPorte = complemento.ele('cartaporte20:CartaPorte')
      .att('Version', '2.0')
      .att('TranspInternac', data.cartaPorte.transpInternac)
      .att('TotalDistRec', data.cartaPorte.totalDistRec);

    // Aquí agregarías todos los elementos específicos de la carta porte
    // como Ubicaciones, Mercancias, FiguraTransporte, etc.
  }

  return root.end({ pretty: true });
}
}