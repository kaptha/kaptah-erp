/**
 * Prueba de humo: descarga un paquete real y lo guarda en disco.
 *
 *   $env:SAT_CER, $env:SAT_KEY, $env:SAT_PASS   (igual que auth-smoke)
 *   $env:SAT_PACKAGE_ID="<IdPaquete>"
 *   $env:SAT_OUT="C:\ruta\salida"   (opcional; default: carpeta temporal del sistema)
 *   npx ts-node -T src/sat-descarga/scripts/download-smoke.ts
 */
import axios from 'axios';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FielRequestBuilder } from '../request-builder/fiel-request-builder';
import { LocalFiel } from '../request-builder/fiel';
import { authenticate } from '../services/authenticate/authenticate';
import { download } from '../services/download/download';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { WebClientException } from '../web-client/web-client.errors';

async function main(): Promise<void> {
  const { SAT_CER, SAT_KEY, SAT_PASS, SAT_PACKAGE_ID, SAT_OUT } = process.env;
  if (!SAT_CER || !SAT_KEY || SAT_PASS === undefined || !SAT_PACKAGE_ID) {
    throw new Error('Define SAT_CER, SAT_KEY, SAT_PASS y SAT_PACKAGE_ID');
  }
  const fiel = LocalFiel.create(readFileSync(SAT_CER), readFileSync(SAT_KEY), SAT_PASS);
  const builder = new FielRequestBuilder(fiel);
  const webClient = new AxiosWebClient(axios.create(), {
    timeout: 10 * 60 * 1000, // los paquetes grandes tardan
    onFireResponse: (r) => console.log(`← HTTP ${r.statusCode} (${(r.body.length / 1024 / 1024).toFixed(2)} MB de SOAP)`),
  });

  const token = await authenticate(webClient, builder);
  console.log('Token OK, descargando…');
  const started = Date.now();
  const result = await download(webClient, builder, token, SAT_PACKAGE_ID);
  console.log(`CodEstatus ${result.status.code} - ${result.status.message} | ${(Date.now() - started) / 1000}s`);

  if (!result.isZip()) {
    console.log(`Paquete vacío o no es ZIP (${result.packageSize} bytes).`);
    process.exit(2);
  }
  const out = join(SAT_OUT ?? tmpdir(), `${SAT_PACKAGE_ID}.zip`);
  writeFileSync(out, result.packageContent);
  console.log(`ZIP guardado: ${out} (${(result.packageSize / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err instanceof WebClientException ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
