export class SatFormatHelper {
  static formatDateTime(date: Date = new Date()): string {
    return `${date.getFullYear()}-` +
      `${String(date.getMonth() + 1).padStart(2, '0')}-` +
      `${String(date.getDate()).padStart(2, '0')}T` +
      `${String(date.getHours()).padStart(2, '0')}:` +
      `${String(date.getMinutes()).padStart(2, '0')}:` +
      `${String(date.getSeconds()).padStart(2, '0')}`;
  }

  static validateDateTime(dateStr: string): boolean {
    // Patrón exacto del SAT para fechas
    const pattern = /^(20[1-9][0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9])$/;
    
    if (!pattern.test(dateStr)) {
      return false;
    }

    const date = new Date(dateStr);
    const now = new Date();

    // Validar que no sea fecha futura
    if (date > now) {
      return false;
    }

    // Validar que no sea más antigua que 72 horas
    const hours72 = 72 * 60 * 60 * 1000;
    if (now.getTime() - date.getTime() > hours72) {
      return false;
    }

    return true;
  }
}