import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TipoPercepcion,
  TipoDeduccion,
  TipoOtroPago,
  TipoNomina,
  TipoContrato,
  TipoJornada,
  TipoRegimen,
  PeriodicidadPago,
  Banco,
  RiesgoPuesto,
  TipoIncapacidad,
  OrigenRecurso,
} from './entities';

@Injectable()
export class FiscalService {
  constructor(
    @InjectRepository(TipoPercepcion)
    private tipoPercepcionRepo: Repository<TipoPercepcion>,
    @InjectRepository(TipoDeduccion)
    private tipoDeduccionRepo: Repository<TipoDeduccion>,
    @InjectRepository(TipoOtroPago)
    private tipoOtroPagoRepo: Repository<TipoOtroPago>,
    @InjectRepository(TipoNomina)
    private tipoNominaRepo: Repository<TipoNomina>,
    @InjectRepository(TipoContrato)
    private tipoContratoRepo: Repository<TipoContrato>,
    @InjectRepository(TipoJornada)
    private tipoJornadaRepo: Repository<TipoJornada>,
    @InjectRepository(TipoRegimen)
    private tipoRegimenRepo: Repository<TipoRegimen>,
    @InjectRepository(PeriodicidadPago)
    private periodicidadPagoRepo: Repository<PeriodicidadPago>,
    @InjectRepository(Banco)
    private bancoRepo: Repository<Banco>,
    @InjectRepository(RiesgoPuesto)
    private riesgoPuestoRepo: Repository<RiesgoPuesto>,
    @InjectRepository(TipoIncapacidad)
    private tipoIncapacidadRepo: Repository<TipoIncapacidad>,
    @InjectRepository(OrigenRecurso)
    private origenRecursoRepo: Repository<OrigenRecurso>,
  ) {}

  // ==================== PERCEPCIONES ====================
  async findAllPercepciones(): Promise<TipoPercepcion[]> {
    return this.tipoPercepcionRepo.find({
      order: { c_TipoPercepcion: 'ASC' },
    });
  }

  async findPercepcionById(id: string): Promise<TipoPercepcion> {
    return this.tipoPercepcionRepo.findOne({
      where: { c_TipoPercepcion: id },
    });
  }

  async findPercepcionesVigentes(): Promise<TipoPercepcion[]> {
    const today = new Date();
    return this.tipoPercepcionRepo
      .createQueryBuilder('percepcion')
      .where('percepcion.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(percepcion.fechaFinVigencia IS NULL OR percepcion.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('percepcion.c_TipoPercepcion', 'ASC')
      .getMany();
  }

  // ==================== DEDUCCIONES ====================
  async findAllDeducciones(): Promise<TipoDeduccion[]> {
    return this.tipoDeduccionRepo.find({
      order: { c_TipoDeduccion: 'ASC' },
    });
  }

  async findDeduccionById(id: string): Promise<TipoDeduccion> {
    return this.tipoDeduccionRepo.findOne({
      where: { c_TipoDeduccion: id },
    });
  }

  async findDeduccionesVigentes(): Promise<TipoDeduccion[]> {
    const today = new Date();
    return this.tipoDeduccionRepo
      .createQueryBuilder('deduccion')
      .where('deduccion.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(deduccion.fechaFinVigencia IS NULL OR deduccion.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('deduccion.c_TipoDeduccion', 'ASC')
      .getMany();
  }

  // ==================== OTROS PAGOS ====================
  async findAllOtrosPagos(): Promise<TipoOtroPago[]> {
    return this.tipoOtroPagoRepo.find({
      order: { c_TipoOtroPago: 'ASC' },
    });
  }

  async findOtroPagoById(id: string): Promise<TipoOtroPago> {
    return this.tipoOtroPagoRepo.findOne({
      where: { c_TipoOtroPago: id },
    });
  }

  async findOtrosPagosVigentes(): Promise<TipoOtroPago[]> {
    const today = new Date();
    return this.tipoOtroPagoRepo
      .createQueryBuilder('otroPago')
      .where('otroPago.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(otroPago.fechaFinVigencia IS NULL OR otroPago.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('otroPago.c_TipoOtroPago', 'ASC')
      .getMany();
  }

  // ==================== TIPOS DE NÓMINA ====================
  async findAllTiposNomina(): Promise<TipoNomina[]> {
    return this.tipoNominaRepo.find({
      order: { c_TipoNomina: 'ASC' },
    });
  }

  async findTipoNominaById(id: string): Promise<TipoNomina> {
    return this.tipoNominaRepo.findOne({
      where: { c_TipoNomina: id },
    });
  }

  async findTiposNominaVigentes(): Promise<TipoNomina[]> {
    const today = new Date();
    return this.tipoNominaRepo
      .createQueryBuilder('tipoNomina')
      .where('tipoNomina.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(tipoNomina.fechaFinVigencia IS NULL OR tipoNomina.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('tipoNomina.c_TipoNomina', 'ASC')
      .getMany();
  }

  // ==================== TIPOS DE CONTRATO ====================
  async findAllTiposContrato(): Promise<TipoContrato[]> {
    return this.tipoContratoRepo.find({
      order: { c_TipoContrato: 'ASC' },
    });
  }

  async findTipoContratoById(id: string): Promise<TipoContrato> {
    return this.tipoContratoRepo.findOne({
      where: { c_TipoContrato: id },
    });
  }

  async findTiposContratoVigentes(): Promise<TipoContrato[]> {
    const today = new Date();
    return this.tipoContratoRepo
      .createQueryBuilder('tipoContrato')
      .where('tipoContrato.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(tipoContrato.fechaFinVigencia IS NULL OR tipoContrato.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('tipoContrato.c_TipoContrato', 'ASC')
      .getMany();
  }

  // ==================== TIPOS DE JORNADA ====================
  async findAllTiposJornada(): Promise<TipoJornada[]> {
    return this.tipoJornadaRepo.find({
      order: { c_TipoJornada: 'ASC' },
    });
  }

  async findTipoJornadaById(id: string): Promise<TipoJornada> {
    return this.tipoJornadaRepo.findOne({
      where: { c_TipoJornada: id },
    });
  }

  async findTiposJornadaVigentes(): Promise<TipoJornada[]> {
    const today = new Date();
    return this.tipoJornadaRepo
      .createQueryBuilder('tipoJornada')
      .where('tipoJornada.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(tipoJornada.fechaFinVigencia IS NULL OR tipoJornada.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('tipoJornada.c_TipoJornada', 'ASC')
      .getMany();
  }

  // ==================== TIPOS DE RÉGIMEN ====================
  async findAllTiposRegimen(): Promise<TipoRegimen[]> {
    return this.tipoRegimenRepo.find({
      order: { c_TipoRegimen: 'ASC' },
    });
  }

  async findTipoRegimenById(id: string): Promise<TipoRegimen> {
    return this.tipoRegimenRepo.findOne({
      where: { c_TipoRegimen: id },
    });
  }

  async findTiposRegimenVigentes(): Promise<TipoRegimen[]> {
    const today = new Date();
    return this.tipoRegimenRepo
      .createQueryBuilder('tipoRegimen')
      .where('tipoRegimen.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(tipoRegimen.fechaFinVigencia IS NULL OR tipoRegimen.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('tipoRegimen.c_TipoRegimen', 'ASC')
      .getMany();
  }

  // ==================== PERIODICIDAD DE PAGO ====================
  async findAllPeriodicidadesPago(): Promise<PeriodicidadPago[]> {
    return this.periodicidadPagoRepo.find({
      order: { c_PeriodicidadPago: 'ASC' },
    });
  }

  async findPeriodicidadPagoById(id: string): Promise<PeriodicidadPago> {
    return this.periodicidadPagoRepo.findOne({
      where: { c_PeriodicidadPago: id },
    });
  }

  async findPeriodicidadesPagoVigentes(): Promise<PeriodicidadPago[]> {
    const today = new Date();
    return this.periodicidadPagoRepo
      .createQueryBuilder('periodicidad')
      .where('periodicidad.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(periodicidad.fechaFinVigencia IS NULL OR periodicidad.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('periodicidad.c_PeriodicidadPago', 'ASC')
      .getMany();
  }

  // ==================== BANCOS ====================
  async findAllBancos(): Promise<Banco[]> {
    return this.bancoRepo.find({
      order: { c_Banco: 'ASC' },
    });
  }

  async findBancoById(id: string): Promise<Banco> {
    return this.bancoRepo.findOne({
      where: { c_Banco: id },
    });
  }

  async findBancosVigentes(): Promise<Banco[]> {
    const today = new Date();
    return this.bancoRepo
      .createQueryBuilder('banco')
      .where('banco.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(banco.fechaFinVigencia IS NULL OR banco.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('banco.c_Banco', 'ASC')
      .getMany();
  }

  // ==================== RIESGO DE PUESTO ====================
  async findAllRiesgosPuesto(): Promise<RiesgoPuesto[]> {
    return this.riesgoPuestoRepo.find({
      order: { c_RiesgoPuesto: 'ASC' },
    });
  }

  async findRiesgoPuestoById(id: string): Promise<RiesgoPuesto> {
    return this.riesgoPuestoRepo.findOne({
      where: { c_RiesgoPuesto: id },
    });
  }

  async findRiesgosPuestoVigentes(): Promise<RiesgoPuesto[]> {
    const today = new Date();
    return this.riesgoPuestoRepo
      .createQueryBuilder('riesgo')
      .where('riesgo.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(riesgo.fechaFinVigencia IS NULL OR riesgo.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('riesgo.c_RiesgoPuesto', 'ASC')
      .getMany();
  }

  // ==================== TIPOS DE INCAPACIDAD ====================
  async findAllTiposIncapacidad(): Promise<TipoIncapacidad[]> {
    return this.tipoIncapacidadRepo.find({
      order: { c_TipoIncapacidad: 'ASC' },
    });
  }

  async findTipoIncapacidadById(id: string): Promise<TipoIncapacidad> {
    return this.tipoIncapacidadRepo.findOne({
      where: { c_TipoIncapacidad: id },
    });
  }

  async findTiposIncapacidadVigentes(): Promise<TipoIncapacidad[]> {
    const today = new Date();
    return this.tipoIncapacidadRepo
      .createQueryBuilder('incapacidad')
      .where('incapacidad.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(incapacidad.fechaFinVigencia IS NULL OR incapacidad.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('incapacidad.c_TipoIncapacidad', 'ASC')
      .getMany();
  }

  // ==================== ORIGEN DE RECURSO ====================
  async findAllOrigenesRecurso(): Promise<OrigenRecurso[]> {
    return this.origenRecursoRepo.find({
      order: { c_OrigenRecurso: 'ASC' },
    });
  }

  async findOrigenRecursoById(id: string): Promise<OrigenRecurso> {
    return this.origenRecursoRepo.findOne({
      where: { c_OrigenRecurso: id },
    });
  }

  async findOrigenesRecursoVigentes(): Promise<OrigenRecurso[]> {
    const today = new Date();
    return this.origenRecursoRepo
      .createQueryBuilder('origen')
      .where('origen.fechaInicioVigencia <= :today', { today })
      .andWhere(
        '(origen.fechaFinVigencia IS NULL OR origen.fechaFinVigencia >= :today)',
        { today },
      )
      .orderBy('origen.c_OrigenRecurso', 'ASC')
      .getMany();
  }
}
