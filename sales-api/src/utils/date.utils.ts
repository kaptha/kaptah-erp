/**
 * 🛠️ Utilidades para manejo de fechas
 * 
 * Esta clase proporciona métodos estáticos para trabajar con fechas
 * sin problemas de zona horaria, especialmente útil para PDFs
 */
export class DateUtils {
  /**
   * 📅 Formatea una fecha sin problemas de zona horaria
   * 
   * Extrae directamente día, mes y año del objeto Date sin hacer
   * conversiones de zona horaria que puedan causar desfases de días.
   * 
   * @param fecha - Fecha a formatear (Date o string)
   * @returns Fecha en formato DD/MM/YYYY
   * 
   * @example
   * // BD tiene: 2025-11-30
   * DateUtils.formatearFechaSinZonaHoraria(new Date('2025-11-30'))
   * // Retorna: "30/11/2025" ✅ (no "29/11/2025")
   */
  static formatearFechaSinZonaHoraria(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    
    try {
      // Si es string, parsearlo a Date
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      // Extraer año, mes y día directamente sin conversión de zona horaria
      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getDate()).padStart(2, '0');
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('❌ Error formateando fecha:', error);
      return 'N/A';
    }
  }

  /**
   * 📅 Formatea una fecha con hora sin problemas de zona horaria
   * 
   * @param fecha - Fecha a formatear (Date o string)
   * @returns Fecha en formato DD/MM/YYYY HH:MM
   */
  static formatearFechaHoraSinZonaHoraria(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    
    try {
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getDate()).padStart(2, '0');
      const hours = String(fechaObj.getHours()).padStart(2, '0');
      const minutes = String(fechaObj.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('❌ Error formateando fecha con hora:', error);
      return 'N/A';
    }
  }

  /**
   * 📅 Formatea una fecha en formato ISO (YYYY-MM-DD)
   * 
   * @param fecha - Fecha a formatear (Date o string)
   * @returns Fecha en formato YYYY-MM-DD
   */
  static formatearFechaISO(fecha: Date | string): string {
    if (!fecha) return '';
    
    try {
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('❌ Error formateando fecha ISO:', error);
      return '';
    }
  }

  /**
   * 🔄 Convierte una fecha string a Date sin ajuste de zona horaria
   * 
   * @param fechaString - Fecha en formato YYYY-MM-DD
   * @returns Objeto Date sin ajuste de zona horaria
   */
  static parsearFechaSinZonaHoraria(fechaString: string): Date | null {
    if (!fechaString) return null;
    
    try {
      const [year, month, day] = fechaString.split('-').map(Number);
      // Crear fecha usando el constructor local, no UTC
      return new Date(year, month - 1, day);
    } catch (error) {
      console.error('❌ Error parseando fecha:', error);
      return null;
    }
  }
}