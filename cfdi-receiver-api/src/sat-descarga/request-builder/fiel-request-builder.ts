import { createHash, randomUUID } from 'node:crypto';
import { cleanPemContents, nospaces } from '../internal/helpers';
import { documentStatusQueryValue } from '../shared/document-status';
import { DownloadType } from '../shared/download-type';
import { requestTypeQueryValue } from '../shared/request-type';
import { RfcMatches } from '../shared/rfc-matches';
import { Fiel } from './fiel';
import { QueryParametersView, RequestBuilder } from './request-builder.interface';

const DES_NS = 'http://DescargaMasivaTerceros.sat.gob.mx';

/**
 * Construye y firma los mensajes SOAP con una Fiel.
 * Equivale a FielRequestBuilder/FielRequestBuilder.php.
 *
 * Nota: el SignedInfo declara exc-c14n pero el digest se calcula sobre el XML
 * compactado con nospaces(), igual que en PHP. El SAT no valida el C14N estricto.
 */
export class FielRequestBuilder implements RequestBuilder {
  constructor(readonly fiel: Fiel) {}

  authorization(created: Date, expires: Date, securityTokenId = ''): string {
    const uuid = securityTokenId || FielRequestBuilder.createXmlSecurityTokenId();
    const certificate = cleanPemContents(this.fiel.certificatePem());
    const createdText = created.toISOString();
    const expiresText = expires.toISOString();

    const keyInfoData = `
      <KeyInfo>
        <o:SecurityTokenReference>
          <o:Reference URI="#${uuid}" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
        </o:SecurityTokenReference>
      </KeyInfo>`;
    const toDigestXml = `
      <u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="_0">
        <u:Created>${createdText}</u:Created>
        <u:Expires>${expiresText}</u:Expires>
      </u:Timestamp>`;
    const signatureData = this.createSignature(toDigestXml, '#_0', keyInfoData);

    const xml = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <s:Header>
          <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" s:mustUnderstand="1">
            <u:Timestamp u:Id="_0">
              <u:Created>${createdText}</u:Created>
              <u:Expires>${expiresText}</u:Expires>
            </u:Timestamp>
            <o:BinarySecurityToken u:Id="${uuid}" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">
              ${certificate}
            </o:BinarySecurityToken>
            ${signatureData}
          </o:Security>
        </s:Header>
        <s:Body>
          <Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"/>
        </s:Body>
      </s:Envelope>`;
    return nospaces(xml);
  }

  query(parameters: QueryParametersView): string {
    if (!parameters.uuid.isEmpty()) {
      return this.queryFolio(parameters);
    }
    return this.queryIssuedReceived(parameters);
  }

  private queryFolio(parameters: QueryParametersView): string {
    const attributes: Record<string, string> = {
      RfcSolicitante: this.fiel.rfc().toUpperCase(),
      Folio: parameters.uuid.value,
    };
    return this.buildFinalXml('SolicitaDescargaFolio', attributes, '');
  }

  private queryIssuedReceived(parameters: QueryParametersView): string {
    const rfcSigner = this.fiel.rfc().toUpperCase();
    const isIssued = parameters.downloadType === DownloadType.Issued;

    // Emitidos: contrapartes son receptores. Recibidos: contraparte es el emisor.
    const rfcIssuer = isIssued ? rfcSigner : parameters.rfcMatches.first().value;
    const rfcReceivers = isIssued ? parameters.rfcMatches : RfcMatches.empty();

    const attributes: Record<string, string> = {
      RfcSolicitante: rfcSigner,
      TipoSolicitud: requestTypeQueryValue(parameters.requestType),
      FechaInicial: parameters.period.start.formatSat(),
      FechaFinal: parameters.period.end.formatSat(),
      RfcEmisor: rfcIssuer,
      TipoComprobante: parameters.documentType,
      EstadoComprobante: documentStatusQueryValue(parameters.documentStatus),
      RfcACuentaTerceros: parameters.rfcOnBehalf.value,
      Complemento: parameters.complement.value,
    };
    if (!isIssued) {
      attributes.RfcReceptor = rfcSigner;
    }

    let xmlRfcReceived = '';
    if (!rfcReceivers.isEmpty()) {
      const items = [...rfcReceivers].map((m) => `<des:RfcReceptor>${escapeXml(m.value)}</des:RfcReceptor>`).join('');
      xmlRfcReceived = `<des:RfcReceptores>${items}</des:RfcReceptores>`;
    }

    const nodeName = isIssued ? 'SolicitaDescargaEmitidos' : 'SolicitaDescargaRecibidos';
    return this.buildFinalXml(nodeName, attributes, xmlRfcReceived);
  }

  private buildFinalXml(nodeName: string, attributes: Record<string, string>, xmlExtra: string): string {
    const attrText = Object.entries(attributes)
      .filter(([, v]) => v !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${escapeXml(k)}="${escapeXml(v)}"`)
      .join(' ');

    const toDigestXml = `
      <des:${nodeName} xmlns:des="${DES_NS}">
        <des:solicitud ${attrText}>
          ${xmlExtra}
        </des:solicitud>
      </des:${nodeName}>`;
    const signatureData = this.createSignature(toDigestXml);

    const xml = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="${DES_NS}" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">
        <s:Header/>
        <s:Body>
          <des:${nodeName}>
            <des:solicitud ${attrText}>
              ${xmlExtra}
              ${signatureData}
            </des:solicitud>
          </des:${nodeName}>
        </s:Body>
      </s:Envelope>`;
    return nospaces(xml);
  }

  verify(requestId: string): string {
    const xmlRequestId = escapeXml(requestId);
    const xmlRfc = escapeXml(this.fiel.rfc());

    const toDigestXml = `
      <des:VerificaSolicitudDescarga xmlns:des="${DES_NS}">
        <des:solicitud IdSolicitud="${xmlRequestId}" RfcSolicitante="${xmlRfc}"></des:solicitud>
      </des:VerificaSolicitudDescarga>`;
    const signatureData = this.createSignature(toDigestXml);

    const xml = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="${DES_NS}" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">
        <s:Header/>
        <s:Body>
          <des:VerificaSolicitudDescarga>
            <des:solicitud IdSolicitud="${xmlRequestId}" RfcSolicitante="${xmlRfc}">
              ${signatureData}
            </des:solicitud>
          </des:VerificaSolicitudDescarga>
        </s:Body>
      </s:Envelope>`;
    return nospaces(xml);
  }

  download(packageId: string): string {
    const xmlPackageId = escapeXml(packageId);
    const xmlRfc = escapeXml(this.fiel.rfc());

    const toDigestXml = `
      <des:PeticionDescargaMasivaTercerosEntrada xmlns:des="${DES_NS}">
        <des:peticionDescarga IdPaquete="${xmlPackageId}" RfcSolicitante="${xmlRfc}"></des:peticionDescarga>
      </des:PeticionDescargaMasivaTercerosEntrada>`;
    const signatureData = this.createSignature(toDigestXml);

    const xml = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="${DES_NS}" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">
        <s:Header/>
        <s:Body>
          <des:PeticionDescargaMasivaTercerosEntrada>
            <des:peticionDescarga IdPaquete="${xmlPackageId}" RfcSolicitante="${xmlRfc}">
              ${signatureData}
            </des:peticionDescarga>
          </des:PeticionDescargaMasivaTercerosEntrada>
        </s:Body>
      </s:Envelope>`;
    return nospaces(xml);
  }

  static createXmlSecurityTokenId(): string {
    return `uuid-${randomUUID()}-1`;
  }

  private createSignature(toDigest: string, signedInfoUri = '', keyInfo = ''): string {
    const digested = createHash('sha1').update(nospaces(toDigest)).digest('base64');
    let signedInfo = this.createSignedInfoCanonicalExclusive(digested, signedInfoUri);
    const signatureValue = this.fiel.sign(signedInfo).toString('base64');
    signedInfo = signedInfo.replace('<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">', '<SignedInfo>');

    const keyInfoData = keyInfo || this.createKeyInfoData();
    return `
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        ${signedInfo}
        <SignatureValue>${signatureValue}</SignatureValue>
        ${keyInfoData}
      </Signature>`;
  }

  private createSignedInfoCanonicalExclusive(digested: string, uri = ''): string {
    const xml = `
      <SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod>
        <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>
        <Reference URI="${uri}">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>
          <DigestValue>${digested}</DigestValue>
        </Reference>
      </SignedInfo>`;
    return nospaces(xml);
  }

  private createKeyInfoData(): string {
    const certificate = cleanPemContents(this.fiel.certificatePem());
    const serial = this.fiel.certificateSerial();
    const issuerName = escapeXml(this.fiel.certificateIssuerName());
    return `
      <KeyInfo>
        <X509Data>
          <X509IssuerSerial>
            <X509IssuerName>${issuerName}</X509IssuerName>
            <X509SerialNumber>${serial}</X509SerialNumber>
          </X509IssuerSerial>
          <X509Certificate>${certificate}</X509Certificate>
        </X509Data>
      </KeyInfo>`;
  }
}

/** Equivale a htmlspecialchars(ENT_XML1 | ENT_COMPAT): escapa & < > " (no la comilla simple) */
export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
