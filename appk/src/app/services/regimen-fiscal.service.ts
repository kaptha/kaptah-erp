import { Injectable } from '@angular/core';

export interface RegimenFiscal {
  clave: string;
  descripcion: string;
  fisica: boolean;
  moral: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RegimenFiscalService {
  
  private regimenesFiscales: RegimenFiscal[] = [
    { clave: '601', descripcion: 'General de Ley Personas Morales', fisica: false, moral: true },
    { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos', fisica: false, moral: true },
    { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', fisica: true, moral: false },
    { clave: '606', descripcion: 'Arrendamiento', fisica: true, moral: false },
    { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes', fisica: true, moral: false },
    { clave: '608', descripcion: 'Demás ingresos', fisica: true, moral: false },
    { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México', fisica: true, moral: true },
    { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)', fisica: true, moral: false },
    { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales', fisica: true, moral: false },
    { clave: '614', descripcion: 'Ingresos por intereses', fisica: true, moral: false },
    { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios', fisica: true, moral: false },
    { clave: '616', descripcion: 'Sin obligaciones fiscales', fisica: true, moral: false },
    { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', fisica: false, moral: true },
    { clave: '621', descripcion: 'Incorporación Fiscal', fisica: true, moral: false },
    { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', fisica: false, moral: true },
    { clave: '623', descripcion: 'Opcional para Grupos de Sociedades', fisica: false, moral: true },
    { clave: '624', descripcion: 'Coordinados', fisica: false, moral: true },
    { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', fisica: true, moral: false },
    { clave: '626', descripcion: 'Régimen Simplificado de Confianza', fisica: true, moral: true }
  ];

  constructor() { }

  /**
   * Obtener todos los regímenes fiscales
   */
  getRegimenesFiscales(): RegimenFiscal[] {
    return this.regimenesFiscales;
  }

  /**
   * Obtener regímenes fiscales filtrados por tipo de persona
   */
  getRegimenesPorTipo(tipoPersona: 'fisica' | 'moral'): RegimenFiscal[] {
    if (tipoPersona === 'fisica') {
      return this.regimenesFiscales.filter(r => r.fisica);
    } else {
      return this.regimenesFiscales.filter(r => r.moral);
    }
  }

  /**
   * Obtener descripción de un régimen por su clave
   */
  getDescripcionByClave(clave: string): string {
    const regimen = this.regimenesFiscales.find(r => r.clave === clave);
    return regimen ? regimen.descripcion : '';
  }

  /**
   * Obtener régimen completo por clave
   */
  getRegimenByClave(clave: string): RegimenFiscal | undefined {
    return this.regimenesFiscales.find(r => r.clave === clave);
  }
}