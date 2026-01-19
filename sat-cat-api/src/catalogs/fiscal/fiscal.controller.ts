import { Controller, Get, Param } from '@nestjs/common';
import { FiscalService } from './fiscal.service';

@Controller('catalogos/fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  // ==================== PERCEPCIONES ====================
  @Get('percepciones')
  findAllPercepciones() {
    return this.fiscalService.findAllPercepciones();
  }

  @Get('percepciones/vigentes')
  findPercepcionesVigentes() {
    return this.fiscalService.findPercepcionesVigentes();
  }

  @Get('percepciones/:id')
  findPercepcionById(@Param('id') id: string) {
    return this.fiscalService.findPercepcionById(id);
  }

  // ==================== DEDUCCIONES ====================
  @Get('deducciones')
  findAllDeducciones() {
    return this.fiscalService.findAllDeducciones();
  }

  @Get('deducciones/vigentes')
  findDeduccionesVigentes() {
    return this.fiscalService.findDeduccionesVigentes();
  }

  @Get('deducciones/:id')
  findDeduccionById(@Param('id') id: string) {
    return this.fiscalService.findDeduccionById(id);
  }

  // ==================== OTROS PAGOS ====================
  @Get('otros-pagos')
  findAllOtrosPagos() {
    return this.fiscalService.findAllOtrosPagos();
  }

  @Get('otros-pagos/vigentes')
  findOtrosPagosVigentes() {
    return this.fiscalService.findOtrosPagosVigentes();
  }

  @Get('otros-pagos/:id')
  findOtroPagoById(@Param('id') id: string) {
    return this.fiscalService.findOtroPagoById(id);
  }

  // ==================== TIPOS DE NÓMINA ====================
  @Get('tipos-nomina')
  findAllTiposNomina() {
    return this.fiscalService.findAllTiposNomina();
  }

  @Get('tipos-nomina/vigentes')
  findTiposNominaVigentes() {
    return this.fiscalService.findTiposNominaVigentes();
  }

  @Get('tipos-nomina/:id')
  findTipoNominaById(@Param('id') id: string) {
    return this.fiscalService.findTipoNominaById(id);
  }

  // ==================== TIPOS DE CONTRATO ====================
  @Get('tipos-contrato')
  findAllTiposContrato() {
    return this.fiscalService.findAllTiposContrato();
  }

  @Get('tipos-contrato/vigentes')
  findTiposContratoVigentes() {
    return this.fiscalService.findTiposContratoVigentes();
  }

  @Get('tipos-contrato/:id')
  findTipoContratoById(@Param('id') id: string) {
    return this.fiscalService.findTipoContratoById(id);
  }

  // ==================== TIPOS DE JORNADA ====================
  @Get('tipos-jornada')
  findAllTiposJornada() {
    return this.fiscalService.findAllTiposJornada();
  }

  @Get('tipos-jornada/vigentes')
  findTiposJornadaVigentes() {
    return this.fiscalService.findTiposJornadaVigentes();
  }

  @Get('tipos-jornada/:id')
  findTipoJornadaById(@Param('id') id: string) {
    return this.fiscalService.findTipoJornadaById(id);
  }

  // ==================== TIPOS DE RÉGIMEN ====================
  @Get('tipos-regimen')
  findAllTiposRegimen() {
    return this.fiscalService.findAllTiposRegimen();
  }

  @Get('tipos-regimen/vigentes')
  findTiposRegimenVigentes() {
    return this.fiscalService.findTiposRegimenVigentes();
  }

  @Get('tipos-regimen/:id')
  findTipoRegimenById(@Param('id') id: string) {
    return this.fiscalService.findTipoRegimenById(id);
  }

  // ==================== PERIODICIDAD DE PAGO ====================
  @Get('periodicidades-pago')
  findAllPeriodicidadesPago() {
    return this.fiscalService.findAllPeriodicidadesPago();
  }

  @Get('periodicidades-pago/vigentes')
  findPeriodicidadesPagoVigentes() {
    return this.fiscalService.findPeriodicidadesPagoVigentes();
  }

  @Get('periodicidades-pago/:id')
  findPeriodicidadPagoById(@Param('id') id: string) {
    return this.fiscalService.findPeriodicidadPagoById(id);
  }

  // ==================== BANCOS ====================
  @Get('bancos')
  findAllBancos() {
    return this.fiscalService.findAllBancos();
  }

  @Get('bancos/vigentes')
  findBancosVigentes() {
    return this.fiscalService.findBancosVigentes();
  }

  @Get('bancos/:id')
  findBancoById(@Param('id') id: string) {
    return this.fiscalService.findBancoById(id);
  }

  // ==================== RIESGO DE PUESTO ====================
  @Get('riesgos-puesto')
  findAllRiesgosPuesto() {
    return this.fiscalService.findAllRiesgosPuesto();
  }

  @Get('riesgos-puesto/vigentes')
  findRiesgosPuestoVigentes() {
    return this.fiscalService.findRiesgosPuestoVigentes();
  }

  @Get('riesgos-puesto/:id')
  findRiesgoPuestoById(@Param('id') id: string) {
    return this.fiscalService.findRiesgoPuestoById(id);
  }

  // ==================== TIPOS DE INCAPACIDAD ====================
  @Get('tipos-incapacidad')
  findAllTiposIncapacidad() {
    return this.fiscalService.findAllTiposIncapacidad();
  }

  @Get('tipos-incapacidad/vigentes')
  findTiposIncapacidadVigentes() {
    return this.fiscalService.findTiposIncapacidadVigentes();
  }

  @Get('tipos-incapacidad/:id')
  findTipoIncapacidadById(@Param('id') id: string) {
    return this.fiscalService.findTipoIncapacidadById(id);
  }

  // ==================== ORIGEN DE RECURSO ====================
  @Get('origenes-recurso')
  findAllOrigenesRecurso() {
    return this.fiscalService.findAllOrigenesRecurso();
  }

  @Get('origenes-recurso/vigentes')
  findOrigenesRecursoVigentes() {
    return this.fiscalService.findOrigenesRecursoVigentes();
  }

  @Get('origenes-recurso/:id')
  findOrigenRecursoById(@Param('id') id: string) {
    return this.fiscalService.findOrigenRecursoById(id);
  }
}
