/**
 * Un renglón del archivo de metadata.
 * Equivale a PackageReader/MetadataItem.php.
 * Las claves conocidas están tipadas; get() sirve para cualquier columna nueva del SAT.
 */
export class MetadataItem {
  constructor(private readonly data: Record<string, string>) {}

  get(key: string): string {
    return this.data[key] ?? '';
  }

  all(): Record<string, string> {
    return { ...this.data };
  }

  get uuid(): string { return this.get('uuid'); }
  get rfcEmisor(): string { return this.get('rfcEmisor'); }
  get nombreEmisor(): string { return this.get('nombreEmisor'); }
  get rfcReceptor(): string { return this.get('rfcReceptor'); }
  get nombreReceptor(): string { return this.get('nombreReceptor'); }
  get rfcPac(): string { return this.get('rfcPac'); }
  get fechaEmision(): string { return this.get('fechaEmision'); }
  get fechaCertificacionSat(): string { return this.get('fechaCertificacionSat'); }
  get monto(): string { return this.get('monto'); }
  /** I ingreso, E egreso, T traslado, N nómina, P pago */
  get efectoComprobante(): string { return this.get('efectoComprobante'); }
  /** "1" vigente, "0" cancelado */
  get estatus(): string { return this.get('estatus'); }
  get fechaCancelacion(): string { return this.get('fechaCancelacion'); }
  get rfcACuentaTerceros(): string { return this.get('rfcACuentaTerceros'); }
  get nombreACuentaTerceros(): string { return this.get('nombreACuentaTerceros'); }

  isVigente(): boolean { return this.estatus === '1'; }
  isCancelado(): boolean { return this.estatus === '0'; }

  toJSON(): Record<string, string> {
    return { uuid: this.uuid, ...this.data };
  }
}
