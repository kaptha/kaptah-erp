import { Injectable } from '@nestjs/common';
import { XmlBuilder } from '../../../shared/helpers/xml-builder.helper';
import { 
  CfdiIngreso, 
  CfdiEgreso, 
  CfdiNomina, 
  CfdiPago,
  CfdiTraslado 
} from '../interfaces/cfdi-types.interface';

interface UserContext {
  createdBy: string;
  userEmail: string;
}

@Injectable()
export class CfdiFactory {
  createXml(tipo: 'I' | 'E' | 'N' | 'P' | 'T', data: any): string {
    // Extraer el contexto del usuario de los datos
    const userContext: UserContext = data.userContext || {
      createdBy: '',
      userEmail: ''
    };

    // Agregar metadata del usuario al XML
    const dataWithMetadata = {
      ...data,
      metadata: {
        createdBy: userContext.createdBy,
        userEmail: userContext.userEmail,
        createdAt: new Date().toISOString()
      }
    };

    switch (tipo) {
      case 'I':
        return XmlBuilder.buildIngresoCfdi(dataWithMetadata);
      case 'E':
        return XmlBuilder.buildEgresoCfdi(dataWithMetadata);
      case 'N':
        return XmlBuilder.buildNominaCfdi(dataWithMetadata);
      case 'P':
        return XmlBuilder.buildPagoCfdi(dataWithMetadata);
      case 'T':
        return XmlBuilder.buildTrasladoCfdi(dataWithMetadata);
      default:
        throw new Error(`Tipo de CFDI no soportado: ${tipo}`);
    }
  }
}