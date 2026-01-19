export class CreateNominaCfdiDto {
    // Datos generales del CFDI
    serie: string;
    folio: string;
    formaPago: string;
    metodoPago: string;
    moneda: string;
    emisor: {
      rfc: string;
      nombre: string;
      regimenFiscal: string;
      registroPatronal: string;
    };
    receptor: {
      rfc: string;
      nombre: string;
      domicilioFiscalReceptor: string;
      regimenFiscalReceptor: string;
      usoCFDI: string;
      curp: string;
      numSeguridadSocial: string;
      fechaInicioRelLaboral: string;
      antiguedad: string;
      tipoContrato: string;
      sindicalizado: string;
      tipoJornada: string;
      tipoRegimen: string;
      numEmpleado: string;
      departamento: string;
      puesto: string;
      riesgoPuesto: string;
      periodicidadPago: string;
      banco: string;
      cuentaBancaria: string;
      salarioBaseCotApor: number;
      salarioDiarioIntegrado: number;
      claveEntFed: string;
    };
    // Datos específicos de nómina
    nomina: {
      tipoNomina: string;
      fechaPago: string;
      fechaInicialPago: string;
      fechaFinalPago: string;
      numDiasPagados: number;
      totalPercepciones: number;
      totalDeducciones: number;
      totalOtrosPagos: number;
      separacionIndemnizacion?: {
        totalPagado: number;
        numAñosServicio: number;
        ultimoSueldoMensOrd: number;
        ingresoAcumulable: number;
        ingresoNoAcumulable: number;
      };
      percepciones: Array<{
        tipoPercepcion: string;
        clave: string;
        concepto: string;
        importeGravado: number;
        importeExento: number;
        horasExtra?: {
          dias: number;
          tipoHoras: string;
          horasExtra: number;
          importePagado: number;
        };
      }>;
      deducciones: Array<{
        tipoDeduccion: string;
        clave: string;
        concepto: string;
        importe: number;
      }>;
      otrosPagos?: Array<{
        tipoOtroPago: string;
        clave: string;
        concepto: string;
        importe: number;
        subsidioAlEmpleo?: {
          subsidioCausado: number;
        };
        compensacionSaldosAFavor?: {
          saldoAFavor: number;
          año: number;
          remanenteSalFav: number;
        };
      }>;
      incapacidades?: Array<{
        diasIncapacidad: number;
        tipoIncapacidad: string;
        importeMonetario: number;
      }>;      
    };
    csdPassword: string;
  }