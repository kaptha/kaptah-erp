import { CfdiBase } from './cfdi-base.interface';
export interface CfdiNomina extends CfdiBase {
    tipoDeComprobante: 'N';
    complemento: {
      nomina: {
        version: string;
        tipoNomina: string;
        fechaPago: Date;
        fechaInicialPago: Date;
        fechaFinalPago: Date;
        numDiasPagados: number;
        totalPercepciones: number;
        totalDeducciones: number;
        emisor: {
          registroPatronal: string;
        };
        receptor: {
          curp: string;
          numSeguridadSocial: string;
          fechaInicioRelLaboral: Date;
          antiguedad: string;
          tipoContrato: string;
          // ... otros campos de nómina
        };
        percepciones: Array<{
          // ... estructura de percepciones
        }>;
        deducciones: Array<{
          // ... estructura de deducciones
        }>;
      };
    };
  }