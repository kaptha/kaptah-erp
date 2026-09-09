/**
 * Prueba de humo: autentica contra el SAT con una FIEL real.
 * NO forma parte del build de Nest; se ejecuta a mano:
 *
 *   $env:SAT_CER="C:\ruta\fiel.cer"; $env:SAT_KEY="C:\ruta\fiel.key"; $env:SAT_PASS="contraseña"
 *   npx ts-node -T src/sat-descarga/scripts/auth-smoke.ts
 *
 * Nunca pongas rutas ni contraseñas en el código ni en git.
 */
import axios from 'axios';
import { readFileSync } from 'node:fs';
import { FielRequestBuilder } from '../request-builder/fiel-request-builder';
import { LocalFiel } from '../request-builder/fiel';
import { authenticate } from '../services/authenticate/authenticate';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { WebClientException } from '../web-client/web-client.errors';

async function main(): Promise<void> {
  const { SAT_CER, SAT_KEY, SAT_PASS } = process.env;
  if (!SAT_CER || !SAT_KEY || SAT_PASS === undefined) {
    throw new Error('Define SAT_CER, SAT_KEY y SAT_PASS');
  }
  const fiel = LocalFiel.create(readFileSync(SAT_CER), readFileSync(SAT_KEY), SAT_PASS);
  console.log(`RFC: ${fiel.rfc()} | FIEL: ${fiel.isFiel()} | vigente hasta: ${fiel.validTo().toISOString()}`);
  if (!fiel.isValid()) {
    throw new Error('El certificado no es FIEL o no está vigente; el SAT lo rechazará');
  }

  const webClient = new AxiosWebClient(axios.create(), {
    onFireRequest: (r) => console.log(`→ POST ${r.uri} (${r.body.length} bytes)`),
    onFireResponse: (r) => console.log(`← HTTP ${r.statusCode} (${r.body.length} bytes)`),
  });

  const started = Date.now();
  const token = await authenticate(webClient, new FielRequestBuilder(fiel));
  console.log(`OK en ${Date.now() - started} ms`);
  console.log(`Token: ${token.value.slice(0, 24)}… | expira: ${token.expires.toISOString()} | válido: ${token.isValid(60)}`);
}

main().catch((err) => {
  if (err instanceof WebClientException) {
    console.error(`${err.name}: ${err.message}`);
    console.error(JSON.stringify(err.toJSON(), null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
