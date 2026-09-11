/**
 * Prueba de humo: verifica el estado de una solicitud real.
 *
 *   $env:SAT_CER, $env:SAT_KEY, $env:SAT_PASS   (igual que auth-smoke)
 *   $env:SAT_REQUEST_ID="<IdSolicitud>"
 *   $env:SAT_POLL="1"   (opcional: reintenta cada 60 s hasta que sea terminal, máx. 30 veces)
 *   npx ts-node -T src/sat-descarga/scripts/verify-smoke.ts
 */
import axios from 'axios';
import { readFileSync } from 'node:fs';
import { FielRequestBuilder } from '../request-builder/fiel-request-builder';
import { LocalFiel } from '../request-builder/fiel';
import { authenticate } from '../services/authenticate/authenticate';
import { InMemoryTokenCache, obtainToken } from '../services/authenticate/token-cache';
import { verify } from '../services/verify/verify';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { WebClientException } from '../web-client/web-client.errors';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const { SAT_CER, SAT_KEY, SAT_PASS, SAT_REQUEST_ID, SAT_POLL } = process.env;
  if (!SAT_CER || !SAT_KEY || SAT_PASS === undefined || !SAT_REQUEST_ID) {
    throw new Error('Define SAT_CER, SAT_KEY, SAT_PASS y SAT_REQUEST_ID');
  }
  const fiel = LocalFiel.create(readFileSync(SAT_CER), readFileSync(SAT_KEY), SAT_PASS);
  const builder = new FielRequestBuilder(fiel);
  const webClient = new AxiosWebClient(axios.create());
  const cache = new InMemoryTokenCache();
  const getToken = () => obtainToken(cache, fiel.rfc(), () => authenticate(webClient, builder));

  const maxAttempts = SAT_POLL === '1' ? 30 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await verify(webClient, builder, await getToken(), SAT_REQUEST_ID);
    const { statusRequest: sr, codeRequest: cr } = result;
    console.log(
      `[${new Date().toISOString()}] CodEstatus ${result.status.code} | EstadoSolicitud ${sr.value} (${sr.message}) | CodigoEstadoSolicitud ${cr.value} (${cr.name}) | CFDIs: ${result.numberCfdis} | paquetes: ${result.countPackages()}`,
    );
    if (result.isTerminal()) {
      if (result.isReadyToDownload()) {
        console.log('IdPaquete(s) para la fase 6 (Download):');
        result.packagesIds.forEach((p) => console.log(`  ${p}`));
      } else {
        console.log(`Solicitud terminó sin paquetes: ${cr.message}`);
      }
      return;
    }
    if (attempt < maxAttempts) {
      console.log('   …aún en proceso, reintento en 60 s');
      await sleep(60_000);
    }
  }
  console.log('Sigue en proceso. Vuelve a ejecutar más tarde.');
}

main().catch((err) => {
  console.error(err instanceof WebClientException ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
