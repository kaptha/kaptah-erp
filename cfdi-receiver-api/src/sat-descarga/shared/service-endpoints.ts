import { ServiceType } from './service-type';

/**
 * URLs de los cuatro web services del SAT para un tipo de servicio.
 * Equivale a Shared/ServiceEndpoints.php.
 *
 * Usa ServiceEndpoints.cfdi() para CFDI regulares y
 * ServiceEndpoints.retenciones() para retenciones e información de pagos.
 * El constructor es público solo para inyectar endpoints falsos en pruebas.
 */
export class ServiceEndpoints {
  constructor(
    readonly authenticate: string,
    readonly query: string,
    readonly verify: string,
    readonly download: string,
    readonly serviceType: ServiceType,
  ) {}

  static cfdi(): ServiceEndpoints {
    return new ServiceEndpoints(
      'https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc',
      'https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/SolicitaDescargaService.svc',
      'https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc',
      'https://cfdidescargamasiva.clouda.sat.gob.mx/DescargaMasivaService.svc',
      ServiceType.Cfdi,
    );
  }

  static retenciones(): ServiceEndpoints {
    return new ServiceEndpoints(
      'https://retendescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc',
      'https://retendescargamasivasolicitud.clouda.sat.gob.mx/SolicitaDescargaService.svc',
      'https://retendescargamasivasolicitud.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc',
      'https://retendescargamasiva.clouda.sat.gob.mx/DescargaMasivaService.svc',
      ServiceType.Retenciones,
    );
  }
}
