import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { QuoteItemResolverService } from './quote-item-resolver.service';
export interface CotizacionItem {
  id?: number;
  cotizacionId?: number;
  productoId?: number;
  servicioId?: number;
  tipo: 'producto' | 'servicio';
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  impuestos: number;
  subtotal: number;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Cotizacion {
  id?: number;
  folio?: string;
  clienteId: number;
  fechaCreacion?: string;
  fechaValidez?: string;
  subtotal?: number;
  impuestos?: number;
  total?: number;
  estado: string;
  moneda?: string;
  observaciones?: string;
  items?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCotizacionDto {
  usuarioId?: number;
  clienteId: number;
  fechaValidez: Date;
  estado: string;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda: string;
  observaciones?: string;
  items: CotizacionItem[];  
}

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {
  private apiUrl = 'http://localhost:4000/cotizaciones';

  constructor(private http: HttpClient, private quoteItemResolver: QuoteItemResolverService) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('No se encontró token de autenticación');
      throw new Error('No se encontró token de autenticación');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Obtener el ID del usuario del localStorage o de donde lo tengas almacenado
  private getUserId(): number {
    // Esta es una implementación básica. Deberías adaptarla según cómo almacenes el ID del usuario
    // Por ejemplo, podrías descodificar un JWT o usar un servicio de autenticación
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : 1; // Valor por defecto 1 si no existe
  }

  getCotizaciones(): Observable<Cotizacion[]> {
    const headers = this.getHeaders();
    return this.http.get<Cotizacion[]>(this.apiUrl, { headers }).pipe(
      tap(response => console.log('Cotizaciones recibidas:', response)),
      catchError(error => {
        console.error('Error al obtener cotizaciones:', error);
        return throwError(() => error);
      })
    );
  }

   getCotizacion(id: number): Observable<Cotizacion> {
  const headers = this.getHeaders();
  
  return this.http.get<Cotizacion>(`${this.apiUrl}/${id}`, { headers }).pipe(
    tap(cotizacion => {
      console.log('Cotización recibida del servidor:', cotizacion);
      
      // Verificar y normalizar el formato de items
      if (!cotizacion.items) {
        console.warn('La cotización no tiene items, inicializando array vacío');
        cotizacion.items = [];
      } else if (typeof cotizacion.items === 'string') {
        try {
          cotizacion.items = JSON.parse(cotizacion.items);
          console.log('Items parseados correctamente de string:', cotizacion.items);
        } catch (e) {
          console.error('Error al parsear items como JSON:', e);
          cotizacion.items = [];
        }
      }
      
      // Verificar nuevamente que items sea un array
      if (!Array.isArray(cotizacion.items)) {
        console.warn('Items no es un array después de procesamiento, inicializando array vacío');
        cotizacion.items = [];
      }
      
      // Si los items están vacíos (como [{}]), inicializar correctamente
      if (cotizacion.items.length === 1 && 
          typeof cotizacion.items[0] === 'object' && 
          cotizacion.items[0] !== null &&
          Object.keys(cotizacion.items[0]).length === 0) {
        console.warn('Items recibidos como [{}], inicializando array vacío');
        cotizacion.items = [];
      }
    }),
    switchMap(cotizacion => this.quoteItemResolver.resolveItemsInfo(cotizacion)),
    tap(cotizacion => {
      console.log('Cotización después de enriquecer items:', cotizacion);
      console.log('Items enriquecidos:', cotizacion.items);
    }),
    catchError(error => {
      console.error(`Error al obtener cotización ${id}:`, error);
      return throwError(() => error);
    })
  );
}

  createCotizacion(cotizacion: CreateCotizacionDto): Observable<Cotizacion> {
    const headers = this.getHeaders();
    
    // Asegurar que se incluya el ID del usuario
    const cotizacionConUsuario = {
      ...cotizacion,
      usuarioId: cotizacion.usuarioId || this.getUserId()
    };
    
    console.log('Datos enviados al crear cotización:', JSON.stringify(cotizacionConUsuario));
    
    return this.http.post<Cotizacion>(this.apiUrl, cotizacionConUsuario, { headers }).pipe(
      tap(response => console.log('Cotización creada:', response)),
      catchError(error => {
        console.error('Error al crear cotización:', error);
        return throwError(() => error);
      })
    );
  }

  updateCotizacion(id: number, cotizacion: CreateCotizacionDto): Observable<Cotizacion> {
    const headers = this.getHeaders();
    
    // Asegurar que se incluya el ID del usuario
    const cotizacionConUsuario = {
      ...cotizacion,
      usuarioId: cotizacion.usuarioId || this.getUserId()
    };
    
    return this.http.put<Cotizacion>(`${this.apiUrl}/${id}`, cotizacionConUsuario, { headers }).pipe(
      tap(response => console.log('Cotización actualizada:', response)),
      catchError(error => {
        console.error(`Error al actualizar cotización ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteCotizacion(id: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers }).pipe(
      tap(() => console.log(`Cotización ${id} eliminada`)),
      catchError(error => {
        console.error(`Error al eliminar cotización ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Descarga un PDF de cotización generado en el backend con Puppeteer
   * @param cotizacionId - ID de la cotización
   * @param estilo - Estilo del template (ej: 'minimal', 'classic', 'modern', 'professional')
   * @returns Observable<Blob> - El archivo PDF como Blob
   */
  descargarPDF(cotizacionId: number, estilo: string): Observable<Blob> {
    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('No se encontró token de autenticación');
      return throwError(() => new Error('No se encontró token de autenticación'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // ✅ CORRECCIÓN: Estilo como parámetro de ruta, no query parameter
    const url = `${this.apiUrl}/${cotizacionId}/pdf/${estilo}`;
    
    console.log('📄 Solicitando PDF de cotización:', {
      cotizacionId,
      estilo,
      url
    });

    return this.http.get(url, {
      responseType: 'blob',
      headers: headers
    }).pipe(
      tap(blob => {
        console.log('✅ PDF de cotización recibido:', {
          size: blob.size,
          type: blob.type
        });
      }),
      catchError(error => {
        console.error('❌ Error al descargar PDF de cotización:', error);
        return throwError(() => error);
      })
    );
  }
  /**
 * Enviar cotización por email
 */
sendQuotationByEmail(cotizacionId: number, emailData: {
  recipientEmail: string;
  customMessage?: string;
  pdfStyle?: string;
}): Observable<any> {
  const headers = this.getHeaders();
  const url = `${this.apiUrl}/${cotizacionId}/send-email`;
  
  console.log('📧 Enviando cotización por email:', {
    cotizacionId,
    recipientEmail: emailData.recipientEmail,
    pdfStyle: emailData.pdfStyle || 'modern'
  });
  
  return this.http.post(url, emailData, { headers }).pipe(
    tap(response => {
      console.log('✅ Cotización enviada por email:', response);
    }),
    catchError(error => {
      console.error('❌ Error al enviar cotización por email:', error);
      return throwError(() => error);
    })
  );
}
}