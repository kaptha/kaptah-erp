/**
 * Prueba de humo: autentica y presenta una solicitud real de descarga.
 * OJO: cada ejecución consume una solicitud del cupo diario del SAT.
 *
 *   $env:SAT_CER, $env:SAT_KEY, $env:SAT_PASS  (igual que auth-smoke)
 *   $env:SAT_FROM="2026-08-01"  $env:SAT_TO="2026-08-31"   (opcional; default: mes anterior)
 *   $env:SAT_TYPE="Recibidos"|"Emitidos"                  (opcional; default Recibidos)
 *   $env:SAT_REQUEST="Metadata"|"CFDI"                    (opcional; default Metadata)
 *   npx ts-node -T src/sat-descarga/scripts/query-smoke.ts
 */
import axios from 'axios';
import { readFileSync } from 'node:fs';
import { FielRequestBuilder } from '../request-builder/fiel-request-builder';
import { LocalFiel } from '../request-builder/fiel';
import { authenticate } from '../services/authenticate/authenticate';
import { QueryParameters } from '../services/query/query-parameters';
import { query } from '../services/query/query';
import { DateTimePeriod } from '../shared/date-time-period';
import { DocumentStatus } from '../shared/document-status';
import { DownloadType } from '../shared/download-type';
import { RequestType } from '../shared/request-type';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { WebClientException } from '../web-client/web-client.errors';

function lastMonth(): [string, string] {
  const d = new Date();
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const m = d.getMonth() === 0 ? 12 : d.getMonth();
  const last = new Date(y, m, 0).getDate();
  const mm = m.toString().padStart(2, '0');
  return [`${y}-${mm}-01T00:00:00`, `${y}-${mm}-${last}T23:59:59`];
}

async function main(): Promise<void> {
  const { SAT_CER, SAT_KEY, SAT_PASS, SAT_FROM, SAT_TO, SAT_TYPE, SAT_REQUEST } = process.env;
  if (!SAT_CER || !SAT_KEY || SAT_PASS === undefined) throw new Error('Define SAT_CER, SAT_KEY y SAT_PASS');

  const fiel = LocalFiel.create(readFileSync(SAT_CER), readFileSync(SAT_KEY), SAT_PASS);
  const builder = new FielRequestBuilder(fiel);
  const webClient = new AxiosWebClient(axios.create(), {
    onFireRequest: (r) => console.log(`→ POST ${r.uri}`),
    onFireResponse: (r) => console.log(`← HTTP ${r.statusCode} (${r.body.length} bytes)`),
  });

  const [from, to] = SAT_FROM && SAT_TO ? [SAT_FROM, SAT_TO] : lastMonth();
  const isXml = (SAT_REQUEST ?? 'Metadata').toUpperCase() === 'CFDI';
  let params = QueryParameters.create()
    .withPeriod(DateTimePeriod.createFromValues(from, to))
    .withDownloadType((SAT_TYPE ?? 'Recibidos') === 'Emitidos' ? DownloadType.Issued : DownloadType.Received)
    .withRequestType(isXml ? RequestType.Xml : RequestType.Metadata);
  if (isXml && params.downloadType === DownloadType.Received) {
    params = params.withDocumentStatus(DocumentStatus.Active); // regla del SAT para XML recibidos
  }
  console.log(`RFC ${fiel.rfc()} | ${JSON.stringify(params.toJSON())}`);

  const token = await authenticate(webClient, builder);
  console.log(`Token OK, expira ${token.expires.toISOString()}`);

  const result = await query(webClient, builder, token, params);
  console.log(`CodEstatus ${result.status.code} - ${result.status.message}`);
  if (result.isAccepted()) {
    console.log(`IdSolicitud: ${result.requestId}   ← guárdalo para la fase 5 (Verify)`);
  } else {
    console.log('La solicitud NO fue aceptada.');
    process.exit(2);
  }
}

main().catch((err) => {
  if (err instanceof WebClientException) {
    console.error(`${err.name}: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
