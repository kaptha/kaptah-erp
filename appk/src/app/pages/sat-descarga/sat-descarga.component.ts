import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  SatDescargaService,
  SatSolicitud,
  SatSolicitudEstado,
  SatSolicitudTipo
} from '../../services/sat-descarga.service';

interface EstadoVista {
  etiqueta: string;
  color: 'primary' | 'accent' | 'warn' | '';
  enProceso: boolean;
}

@Component({
  selector: 'app-sat-descarga',
  templateUrl: './sat-descarga.component.html',
  styleUrls: ['./sat-descarga.component.css'],
  standalone: false
})
export class SatDescargaComponent implements OnInit, OnDestroy {
  // =========================================================
  // FORM
  // =========================================================
  form = new FormGroup({
    tipo: new FormControl<SatSolicitudTipo>('RECIBIDOS', { nonNullable: true, validators: [Validators.required] }),
    fechaInicial: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fechaFinal: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  // =========================================================
  // UI STATE
  // =========================================================
  isLoading = false;
  isSubmitting = false;
  procesandoId: string | null = null;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  solicitudes: SatSolicitud[] = [];
  columnas = ['periodo', 'tipo', 'estado', 'cfdis', 'actualizado', 'acciones'];

  private refresco?: Subscription;

  private readonly ESTADOS: Record<SatSolicitudEstado, EstadoVista> = {
    ENVIADA: { etiqueta: 'Esperando al SAT', color: 'accent', enProceso: true },
    LISTA: { etiqueta: 'Lista para descargar', color: 'accent', enProceso: true },
    DESCARGANDO: { etiqueta: 'Descargando', color: 'accent', enProceso: true },
    IMPORTADA: { etiqueta: 'Importada', color: 'primary', enProceso: false },
    SIN_CFDI: { etiqueta: 'Sin comprobantes', color: '', enProceso: false },
    RECHAZADA: { etiqueta: 'Rechazada por el SAT', color: 'warn', enProceso: false },
    VENCIDA: { etiqueta: 'Vencida', color: 'warn', enProceso: false },
    ERROR: { etiqueta: 'Error', color: 'warn', enProceso: false }
  };

  constructor(private satDescarga: SatDescargaService) {}

  ngOnInit(): void {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.form.patchValue({
      fechaInicial: this.toInputDate(inicioMes),
      fechaFinal: this.toInputDate(hoy)
    });
    this.cargar();
    // Mientras haya solicitudes en proceso, refresca cada minuto
    this.refresco = interval(60_000).subscribe(() => {
      if (this.solicitudes.some((s) => this.vista(s.estado).enProceso)) {
        this.cargar(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.refresco?.unsubscribe();
  }

  // =========================================================
  // DATA
  // =========================================================
  cargar(silencioso = false): void {
    if (!silencioso) this.isLoading = true;
    this.satDescarga
      .listar()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => (this.solicitudes = data),
        error: (error: Error) => this.notificar('error', error.message)
      });
  }

  solicitar(): void {
    if (this.form.invalid || this.isSubmitting) return;
    const { tipo, fechaInicial, fechaFinal } = this.form.getRawValue();
    if (fechaInicial > fechaFinal) {
      this.notificar('error', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }

    this.isSubmitting = true;
    this.satDescarga
      .solicitar({ tipo, tipoSolicitud: 'CFDI', fechaInicial, fechaFinal })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (s) => {
          this.solicitudes = [s, ...this.solicitudes];
          this.notificar('ok', 'Solicitud enviada al SAT. Suele tardar de minutos a horas; te avisaremos aquí.');
        },
        error: (error: Error) => this.notificar('error', error.message)
      });
  }

  procesar(s: SatSolicitud): void {
    if (this.procesandoId) return;
    this.procesandoId = s.id;
    this.satDescarga
      .procesar(s.id)
      .pipe(finalize(() => (this.procesandoId = null)))
      .subscribe({
        next: (actualizada) => {
          this.solicitudes = this.solicitudes.map((x) => (x.id === actualizada.id ? actualizada : x));
          if (actualizada.estado === 'IMPORTADA') {
            this.notificar('ok', `${this.cfdisImportados(actualizada)} CFDI importados. Ya aparecen en Ingresos/Egresos.`);
          } else if (actualizada.estado === 'ENVIADA') {
            this.notificar('ok', 'El SAT aún no termina de procesar la solicitud.');
          }
        },
        error: (error: Error) => this.notificar('error', error.message)
      });
  }

  // =========================================================
  // VIEW HELPERS
  // =========================================================
  vista(estado: SatSolicitudEstado): EstadoVista {
    return this.ESTADOS[estado] ?? { etiqueta: estado, color: '', enProceso: false };
  }

  puedeProcesar(s: SatSolicitud): boolean {
    return this.vista(s.estado).enProceso;
  }

  cfdisImportados(s: SatSolicitud): number {
    return (s.paquetes || []).reduce((sum, p) => sum + (p.cfdisImportados || 0), 0);
  }

  tipoLabel(tipo: SatSolicitudTipo): string {
    return tipo === 'RECIBIDOS' ? 'Recibidos (gastos)' : 'Emitidos (ingresos)';
  }

  periodo(s: SatSolicitud): string {
    const a = this.formatDate(s.fechaInicial);
    const b = this.formatDate(s.fechaFinal);
    return a === b ? a : `${a} – ${b}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    // fechaInicial/fechaFinal vienen sin zona (YYYY-MM-DDTHH:mm:ss); no convertir a UTC
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  }

  detalleError(s: SatSolicitud): string {
    if (s.error) return s.error;
    const p = (s.paquetes || []).find((x) => x.error);
    return p?.error || '';
  }

  private notificar(tipo: 'ok' | 'error', texto: string): void {
    this.mensaje = { tipo, texto };
    setTimeout(() => (this.mensaje = null), 8000);
  }

  private toInputDate(date: Date): string {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }
}
