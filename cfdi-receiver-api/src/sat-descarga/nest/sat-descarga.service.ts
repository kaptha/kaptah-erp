import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { XmlImportService } from '../../xml/services/xml-import.service';
import { ServiceConsumer } from '../internal/service-consumer';
import { CfdiPackageReader } from '../package-reader/cfdi-package-reader';
import { AsyncRequestBuilder } from '../request-builder/signing-request-builder';
import { VaultFiel } from '../request-builder/vault-fiel';
import { AUTHENTICATE_SOAP_ACTION } from '../services/authenticate/authenticate';
import { AuthenticateTranslator } from '../services/authenticate/authenticate-translator';
import { InMemoryTokenCache, obtainToken } from '../services/authenticate/token-cache';
import { DOWNLOAD_SOAP_ACTION } from '../services/download/download';
import { DownloadTranslator } from '../services/download/download-translator';
import { QueryParameters } from '../services/query/query-parameters';
import { QueryTranslator } from '../services/query/query-translator';
import { querySoapAction } from '../services/query/query';
import { VERIFY_SOAP_ACTION } from '../services/verify/verify';
import { VerifyResult } from '../services/verify/verify-result';
import { VerifyTranslator } from '../services/verify/verify-translator';
import { DateTimePeriod } from '../shared/date-time-period';
import { DocumentStatus } from '../shared/document-status';
import { DownloadType } from '../shared/download-type';
import { RequestType } from '../shared/request-type';
import { ServiceEndpoints } from '../shared/service-endpoints';
import { Token } from '../shared/token';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { SoapFaultError, WebClientException } from '../web-client/web-client.errors';
import { SatSolicitud, SatSolicitudOrigen, SatSolicitudTipo, SatSolicitudTipoSolicitud } from './entities/sat-solicitud.entity';
import { SatDescargaConfig } from './sat-descarga.config';

export interface SolicitarOptions {
  cuentaUid: string;
  tipo: SatSolicitudTipo;
  tipoSolicitud: SatSolicitudTipoSolicitud;
  /** YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss */
  fechaInicial: string;
  fechaFinal: string;
  origen: SatSolicitudOrigen;
}

/** Sesión firmante para una cuenta: builder remoto + token del SAT */
interface Sesion {
  fiel: VaultFiel;
  builder: AsyncRequestBuilder;
  token: Token;
}

const MAX_VERIFICACIONES = 240; // ~5 días a un intento cada 30 min

/**
 * Fachada del módulo: une cert-vault (firma), el SAT (4 servicios) y XmlImportService.
 * Equivale a Service.php + la lógica de orquestación que en PHP queda en manos del usuario.
 */
@Injectable()
export class SatDescargaService {
  private readonly logger = new Logger(SatDescargaService.name);
  private readonly endpoints = ServiceEndpoints.cfdi();
  private readonly tokens = new InMemoryTokenCache();
  private readonly webClient: AxiosWebClient;
  private readonly downloadClient: AxiosWebClient;

  constructor(
    @InjectRepository(SatSolicitud) private readonly repo: Repository<SatSolicitud>,
    private readonly http: HttpService,
    private readonly config: SatDescargaConfig,
    private readonly xmlImport: XmlImportService,
  ) {
    const log = (prefix: string) => (r: { statusCode?: number; uri?: string; body: string }) =>
      this.logger.debug(`${prefix} ${r.uri ?? `HTTP ${r.statusCode}`} (${r.body.length} bytes)`);
    this.webClient = new AxiosWebClient(http.axiosRef, { timeout: 60_000, onFireRequest: log('→'), onFireResponse: log('←') });
    this.downloadClient = new AxiosWebClient(http.axiosRef, { timeout: 10 * 60_000, onFireRequest: log('→'), onFireResponse: log('←') });
  }

  // ───────────────────────── Consultas ─────────────────────────

  listar(cuentaUid: string, limit = 50): Promise<SatSolicitud[]> {
    return this.repo.find({ where: { cuentaUid }, order: { createdAt: 'DESC' }, take: limit });
  }

  async obtener(cuentaUid: string, id: string): Promise<SatSolicitud> {
    const s = await this.repo.findOne({ where: { id, cuentaUid } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    return s;
  }

  pendientes(): Promise<SatSolicitud[]> {
    return this.repo.find({ where: { estado: In(['ENVIADA', 'LISTA', 'DESCARGANDO']) }, order: { createdAt: 'ASC' } });
  }

  // ───────────────────────── Paso 2: solicitar ─────────────────────────

  async solicitar(opts: SolicitarOptions): Promise<SatSolicitud> {
    this.config.assertConfigured();
    const params = this.buildParams(opts);
    const errors = params.validate();
    if (errors.length) throw new BadRequestException(errors.join(' '));

    const fechaInicial = params.period.start.formatSat();
    const fechaFinal = params.period.end.formatSat();

    // El SAT rechaza duplicados (5005); mejor detectarlo aquí sin gastar cupo
    const dup = await this.repo.findOne({
      where: { cuentaUid: opts.cuentaUid, tipo: opts.tipo, tipoSolicitud: opts.tipoSolicitud, fechaInicial, fechaFinal, estado: In(['ENVIADA', 'LISTA', 'DESCARGANDO', 'IMPORTADA']) },
    });
    if (dup) throw new ConflictException(`Ya existe una solicitud ${dup.estado} para ese periodo (${dup.idSolicitud})`);

    const sesion = await this.sesion(opts.cuentaUid, `${opts.tipo}/${opts.tipoSolicitud}`, `${fechaInicial}..${fechaFinal}`);
    const translator = new QueryTranslator();
    const body = await sesion.builder.query(params);
    const raw = await ServiceConsumer.consume(this.webClient, querySoapAction(params), this.endpoints.query, body, sesion.token);
    const result = translator.createQueryResultFromSoapResponse(raw);

    if (!result.isAccepted()) {
      throw new BadRequestException(`SAT rechazó la solicitud: ${result.status.code} - ${result.status.message}`);
    }

    const solicitud = this.repo.create({
      cuentaUid: opts.cuentaUid,
      rfc: sesion.fiel.rfc(),
      idSolicitud: result.requestId,
      tipo: opts.tipo,
      tipoSolicitud: opts.tipoSolicitud,
      fechaInicial,
      fechaFinal,
      estado: 'ENVIADA',
      origen: opts.origen,
      paquetes: [],
    });
    const saved = await this.repo.save(solicitud);
    this.logger.log(`Solicitud ${saved.idSolicitud} aceptada (${opts.tipo} ${opts.tipoSolicitud} ${fechaInicial}..${fechaFinal}) cuenta ${opts.cuentaUid}`);
    return saved;
  }

  // ───────────────────────── Paso 3: verificar ─────────────────────────

  async verificar(solicitud: SatSolicitud): Promise<SatSolicitud> {
    this.config.assertConfigured();
    if (solicitud.estado !== 'ENVIADA') return solicitud;

    let result: VerifyResult;
    try {
      const sesion = await this.sesion(solicitud.cuentaUid, 'VERIFY', solicitud.idSolicitud);
      const body = await sesion.builder.verify(solicitud.idSolicitud);
      const raw = await ServiceConsumer.consume(this.webClient, VERIFY_SOAP_ACTION, this.endpoints.verify, body, sesion.token);
      result = new VerifyTranslator().createVerifyResultFromSoapResponse(raw);
    } catch (error) {
      return this.registrarError(solicitud, error, /* terminal */ error instanceof SoapFaultError);
    }

    solicitud.intentosVerificacion += 1;
    solicitud.ultimaVerificacion = new Date();
    solicitud.estadoSolicitudSat = result.statusRequest.value;
    solicitud.codigoEstadoSat = result.codeRequest.value;
    solicitud.numeroCfdis = result.numberCfdis;

    if (result.isReadyToDownload()) {
      solicitud.estado = 'LISTA';
      solicitud.paquetes = result.packagesIds.map((id) => ({ id, descargado: false }));
    } else if (result.statusRequest.isFinished()) {
      solicitud.estado = result.numberCfdis === 0 ? 'SIN_CFDI' : 'ERROR';
      solicitud.error = result.numberCfdis === 0 ? null : 'Terminada sin paquetes';
    } else if (result.statusRequest.isRejected() || result.statusRequest.isFailure()) {
      solicitud.estado = result.codeRequest.isEmptyResult() ? 'SIN_CFDI' : 'RECHAZADA';
      solicitud.error = result.codeRequest.isEmptyResult() ? null : `${result.codeRequest.value} - ${result.codeRequest.message}`;
    } else if (result.statusRequest.isExpired()) {
      solicitud.estado = 'VENCIDA';
    } else if (solicitud.intentosVerificacion >= MAX_VERIFICACIONES) {
      solicitud.estado = 'ERROR';
      solicitud.error = `Sin respuesta del SAT tras ${MAX_VERIFICACIONES} verificaciones`;
    }
    return this.repo.save(solicitud);
  }

  // ───────────────────────── Paso 4: descargar e importar ─────────────────────────

  async descargarEImportar(solicitud: SatSolicitud): Promise<SatSolicitud> {
    this.config.assertConfigured();
    if (solicitud.estado !== 'LISTA' && solicitud.estado !== 'DESCARGANDO') return solicitud;
    solicitud.estado = 'DESCARGANDO';
    await this.repo.save(solicitud);

    const sesion = await this.sesion(solicitud.cuentaUid, 'DOWNLOAD', solicitud.idSolicitud);
    const translator = new DownloadTranslator();

    for (const paquete of solicitud.paquetes) {
      if (paquete.descargado) continue;
      try {
        const body = await sesion.builder.download(paquete.id);
        const token = await this.token(sesion); // el token pudo vencer entre paquetes grandes
        const raw = await ServiceConsumer.consume(this.downloadClient, DOWNLOAD_SOAP_ACTION, this.endpoints.download, body, token);
        const result = translator.createDownloadResultFromSoapResponse(raw);
        if (!result.status.isAccepted() || !result.isZip()) {
          paquete.error = `SAT ${result.status.code} - ${result.status.message} (${result.packageSize} bytes)`;
          continue;
        }
        paquete.bytes = result.packageSize;
        paquete.error = undefined;

        if (solicitud.tipoSolicitud === 'CFDI') {
          const stats = await this.importarCfdis(result.packageContent, solicitud.cuentaUid);
          paquete.cfdisEnPaquete = stats.total;
          paquete.cfdisImportados = stats.importados;
          paquete.duplicados = stats.duplicados;
        }
        paquete.descargado = true;
        this.logger.log(`Paquete ${paquete.id}: ${paquete.bytes} bytes, ${paquete.cfdisImportados ?? 0} CFDI importados`);
      } catch (error) {
        paquete.error = (error as Error).message;
        this.logger.error(`Paquete ${paquete.id} falló: ${paquete.error}`);
      }
      await this.repo.save(solicitud);
    }

    const todos = solicitud.paquetes.every((p) => p.descargado);
    solicitud.estado = todos ? 'IMPORTADA' : 'DESCARGANDO';
    if (todos) solicitud.error = null;
    return this.repo.save(solicitud);
  }

  private async importarCfdis(zip: Buffer, cuentaUid: string): Promise<{ total: number; importados: number; duplicados: number }> {
    const reader = await CfdiPackageReader.createFromContents(zip);
    let total = 0, importados = 0, duplicados = 0;
    for await (const [, xml] of reader.cfdis()) {
      total++;
      const r = await this.xmlImport.procesarXmlDesdeContenido(xml, cuentaUid);
      if (r.success) importados++;
      else if (r.message === 'XML duplicado') duplicados++;
    }
    return { total, importados, duplicados };
  }

  // ───────────────────────── Internos ─────────────────────────

  private buildParams(opts: SolicitarOptions): QueryParameters {
    const norm = (d: string, end: boolean) => (d.length === 10 ? `${d}T${end ? '23:59:59' : '00:00:00'}` : d);
    let p = QueryParameters.create()
      .withPeriod(DateTimePeriod.createFromValues(norm(opts.fechaInicial, false), norm(opts.fechaFinal, true)))
      .withDownloadType(opts.tipo === 'EMITIDOS' ? DownloadType.Issued : DownloadType.Received)
      .withRequestType(opts.tipoSolicitud === 'CFDI' ? RequestType.Xml : RequestType.Metadata);
    if (opts.tipo === 'RECIBIDOS' && opts.tipoSolicitud === 'CFDI') {
      p = p.withDocumentStatus(DocumentStatus.Active); // regla del SAT: XML recibidos solo vigentes
    }
    return p;
  }

  private async sesion(cuentaUid: string, requestType: string, requestPeriod: string): Promise<Sesion> {
    const fiel = await VaultFiel.load(this.http.axiosRef, cuentaUid, {
      baseUrl: this.config.certVaultUrl,
      serviceToken: this.config.certVaultServiceToken,
      requestType,
      requestPeriod,
    });
    const builder = new AsyncRequestBuilder(fiel);
    const partial: Sesion = { fiel, builder, token: Token.empty() };
    partial.token = await this.token(partial);
    return partial;
  }

  private token(sesion: Sesion): Promise<Token> {
    return obtainToken(this.tokens, sesion.fiel.cuentaUid, async () => {
      const translator = new AuthenticateTranslator();
      const now = new Date();
      const body = await sesion.builder.authorization(now, new Date(now.getTime() + 5 * 60_000));
      const raw = await ServiceConsumer.consume(this.webClient, AUTHENTICATE_SOAP_ACTION, this.endpoints.authenticate, body);
      return translator.createTokenFromSoapResponse(raw);
    });
  }

  private async registrarError(solicitud: SatSolicitud, error: unknown, terminal: boolean): Promise<SatSolicitud> {
    const msg = error instanceof WebClientException ? `${error.name}: ${error.message}` : (error as Error).message;
    this.logger.warn(`Solicitud ${solicitud.idSolicitud}: ${msg}`);
    solicitud.error = msg;
    solicitud.ultimaVerificacion = new Date();
    solicitud.intentosVerificacion += 1;
    if (terminal) solicitud.estado = 'ERROR';
    return this.repo.save(solicitud);
  }
}
