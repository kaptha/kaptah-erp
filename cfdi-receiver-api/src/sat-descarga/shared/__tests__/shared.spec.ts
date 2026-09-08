import { DateTimePeriod } from '../date-time-period';
import { SatDateTime } from '../sat-date-time';
import { ServiceEndpoints } from '../service-endpoints';
import { ServiceType } from '../service-type';
import { StatusRequest } from '../status-request';

describe('SatDateTime', () => {
  it('conserva el reloj de pared sin importar la zona del proceso', () => {
    expect(SatDateTime.create('2026-01-01T00:00:00').formatSat()).toBe('2026-01-01T00:00:00');
    expect(SatDateTime.create('2026-01-31T23:59:59').formatSat()).toBe('2026-01-31T23:59:59');
  });

  it('asume 00:00:00 cuando solo llega la fecha', () => {
    expect(SatDateTime.create('2026-03-15').formatSat()).toBe('2026-03-15T00:00:00');
  });

  it('rechaza formatos y fechas inexistentes', () => {
    expect(() => SatDateTime.create('15/03/2026')).toThrow();
    expect(() => SatDateTime.create('2026-02-30')).toThrow();
  });

  it('compara correctamente', () => {
    const a = SatDateTime.create('2026-01-01');
    const b = SatDateTime.create('2026-01-02');
    expect(a.compareTo(b)).toBeLessThan(0);
    expect(b.compareTo(a)).toBeGreaterThan(0);
    expect(a.compareTo(SatDateTime.create('2026-01-01'))).toBe(0);
  });
});

describe('DateTimePeriod', () => {
  it('se crea desde strings y serializa', () => {
    const p = DateTimePeriod.createFromValues('2026-01-01', '2026-01-31T23:59:59');
    expect(p.toJSON()).toEqual({ start: '2026-01-01T00:00:00', end: '2026-01-31T23:59:59' });
  });

  it('acepta start == end', () => {
    expect(() => DateTimePeriod.createFromValues('2026-01-01', '2026-01-01')).not.toThrow();
  });

  it('rechaza end < start', () => {
    expect(() => DateTimePeriod.createFromValues('2026-01-02', '2026-01-01')).toThrow();
  });
});

describe('ServiceEndpoints', () => {
  it('cfdi() y retenciones() apuntan a hosts distintos', () => {
    const cfdi = ServiceEndpoints.cfdi();
    const ret = ServiceEndpoints.retenciones();
    expect(cfdi.serviceType).toBe(ServiceType.Cfdi);
    expect(ret.serviceType).toBe(ServiceType.Retenciones);
    expect(cfdi.download).toContain('cfdidescargamasiva.clouda');
    expect(ret.download).toContain('retendescargamasiva.clouda');
    expect(cfdi.authenticate).not.toBe(ret.authenticate);
  });
});

describe('StatusRequest', () => {
  it('mapea los 6 estados conocidos', () => {
    expect(StatusRequest.fromValue(1).isAccepted()).toBe(true);
    expect(StatusRequest.fromValue(2).isInProgress()).toBe(true);
    expect(StatusRequest.fromValue(3).isFinished()).toBe(true);
    expect(StatusRequest.fromValue(4).isFailure()).toBe(true);
    expect(StatusRequest.fromValue(5).isRejected()).toBe(true);
    expect(StatusRequest.fromValue(6).isExpired()).toBe(true);
  });

  it('acepta el valor como string tal como llega del XML', () => {
    const s = StatusRequest.fromValue('3');
    expect(s.value).toBe(3);
    expect(s.message).toBe('Terminada');
  });

  it('devuelve Unknown para valores no catalogados', () => {
    const s = StatusRequest.fromValue(99);
    expect(s.isUnknown()).toBe(true);
    expect(s.isTerminal()).toBe(false);
    expect(StatusRequest.fromValue('abc').value).toBe(0);
  });

  it('isTerminal distingue estados finales de los que siguen en polling', () => {
    expect(StatusRequest.fromValue(1).isTerminal()).toBe(false);
    expect(StatusRequest.fromValue(2).isTerminal()).toBe(false);
    expect(StatusRequest.fromValue(3).isTerminal()).toBe(true);
    expect(StatusRequest.fromValue(6).isTerminal()).toBe(true);
  });

  it('serializa a JSON', () => {
    expect(JSON.parse(JSON.stringify(StatusRequest.fromValue(2)))).toEqual({
      value: 2, name: 'InProgress', message: 'En proceso',
    });
  });
});
