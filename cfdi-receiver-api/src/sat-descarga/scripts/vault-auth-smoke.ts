/**
 * Prueba de humo de la tanda 2: autentica contra el SAT firmando en cert-vault (sin llave local).
 *
 *   $env:CERT_VAULT_URL="https://reliable-harmony-production-ca69.up.railway.app/api"
 *   $env:CERT_VAULT_SERVICE_TOKEN="<token>"
 *   $env:SAT_CUENTA_UID="<userId de la FIEL en cert-vault>"
 *   npx ts-node -T src/sat-descarga/scripts/vault-auth-smoke.ts
 */
import axios from 'axios';
import { ServiceConsumer } from '../internal/service-consumer';
import { AsyncRequestBuilder } from '../request-builder/signing-request-builder';
import { VaultFiel } from '../request-builder/vault-fiel';
import { AUTHENTICATE_SOAP_ACTION } from '../services/authenticate/authenticate';
import { AuthenticateTranslator } from '../services/authenticate/authenticate-translator';
import { ServiceEndpoints } from '../shared/service-endpoints';
import { AxiosWebClient } from '../web-client/axios-web-client';
import { WebClientException } from '../web-client/web-client.errors';

async function main(): Promise<void> {
  const { CERT_VAULT_URL, CERT_VAULT_SERVICE_TOKEN, SAT_CUENTA_UID } = process.env;
  if (!CERT_VAULT_URL || !CERT_VAULT_SERVICE_TOKEN || !SAT_CUENTA_UID) {
    throw new Error('Define CERT_VAULT_URL, CERT_VAULT_SERVICE_TOKEN y SAT_CUENTA_UID');
  }
  const http = axios.create();
  const fiel = await VaultFiel.load(http, SAT_CUENTA_UID, {
    baseUrl: CERT_VAULT_URL.replace(/\/+$/, ''),
    serviceToken: CERT_VAULT_SERVICE_TOKEN,
    requestType: 'SMOKE',
  });
  console.log(`cert-vault OK | RFC ${fiel.rfc()} | serie ${fiel.certificateSerial()} | válida: ${fiel.isValid()}`);

  const builder = new AsyncRequestBuilder(fiel);
  const now = new Date();
  const body = await builder.authorization(now, new Date(now.getTime() + 5 * 60_000));
  console.log('Firma remota OK (SignatureValue presente):', /<SignatureValue>[A-Za-z0-9+/=]{300,}<\/SignatureValue>/.test(body));

  const webClient = new AxiosWebClient(http, {
    onFireResponse: (r) => console.log(`← SAT HTTP ${r.statusCode} (${r.body.length} bytes)`),
  });
  const raw = await ServiceConsumer.consume(webClient, AUTHENTICATE_SOAP_ACTION, ServiceEndpoints.cfdi().authenticate, body);
  const token = new AuthenticateTranslator().createTokenFromSoapResponse(raw);
  console.log(`SAT OK | token ${token.value.slice(0, 20)}… | expira ${token.expires.toISOString()} | válido: ${token.isValid(60)}`);
}

main().catch((err) => {
  console.error(err instanceof WebClientException ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
