import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DocumentType } from '../shared/enums/document-type.enum';

export interface DesignSettings {
  invoiceDesignId?: string;
  deliveryNoteDesignId?: string;
  quoteDesignId?: string;
  cfdiDesignId?: string; // ⭐ AGREGAR
}

@Injectable({
  providedIn: 'root'
})
export class DesignSettingsService {
  private apiUrl = 'http://localhost:3000/api/design';
  private selectedDesign = new BehaviorSubject<string>(
    localStorage.getItem('selectedDesign') || 'minimal'
  );

  // Diseños predeterminados
  private defaultSettings: DesignSettings = {
    invoiceDesignId: 'classic-invoice',
    deliveryNoteDesignId: 'classic-delivery',
    quoteDesignId: 'classic-quote'
  };

  // Definición de diseños disponibles
  private availableDesigns = {
    invoice: [
      { id: 'classic-invoice', name: 'Clásico' },
      { id: 'modern-invoice', name: 'Moderno' },
      { id: 'minimal-invoice', name: 'Minimalista' },
      { id: 'professional-invoice', name: 'Profesional' },
      { id: 'creative-invoice', name: 'Creativo' }
    ],
    deliveryNote: [
      { id: 'classic-delivery', name: 'Clásico' },
      { id: 'modern-delivery', name: 'Moderno' },
      { id: 'minimal-delivery', name: 'Minimalista' },
      { id: 'professional-delivery', name: 'Profesional' },
      { id: 'creative-delivery', name: 'Creativo' }
    ],
    quote: [
      { id: 'classic-quote', name: 'Clásico' },
      { id: 'modern-quote', name: 'Moderno' },
      { id: 'minimal-quote', name: 'Minimalista' },
      { id: 'professional-quote', name: 'Profesional' },
      { id: 'creative-quote', name: 'Creativo' },
      { id: 'formal-quote',   name: 'Formal' },
      { id: 'blue-quote',     name: 'Blue' },
      { id: 'clean-quote',    name: 'Clean' },
      { id: 'mint-quote',     name: 'Mint' },
      { id: 'purpple-quote',  name: 'Purpple' }
    ],
  };

  constructor(private http: HttpClient) { }

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

  setSelectedDesign(value: string): void {
    this.selectedDesign.next(value);
    localStorage.setItem('selectedDesign', value);
  }

  gsetSelectedDesign(design: string) {
    this.selectedDesign.next(design);
  }

  getSelectedDesign(): Observable<string> {
    return this.selectedDesign.asObservable();
  }

  getSelectedDesignValue(): string {
    return this.selectedDesign.value;
  }

  // Obtener configuración actual del usuario
  getUserDesignSettings(): Observable<DesignSettings> {
    try {
      const headers = this.getHeaders();
      return this.http.get<DesignSettings>(`${this.apiUrl}/settings`, { headers })
        .pipe(
          catchError(error => {
            console.error('Error al obtener configuraciones, usando predeterminadas:', error);
            return of(this.defaultSettings);
          })
        );
    } catch (error) {
      console.error('Error obteniendo headers, usando configuraciones predeterminadas:', error);
      return of(this.defaultSettings);
    }
  }

  // Guardar un nuevo diseño seleccionado
  saveDesignSetting(documentType: DocumentType, designId: string): Observable<any> {
    try {
      const headers = this.getHeaders();
      return this.http.post(`${this.apiUrl}/settings`, { 
        type: documentType, 
        designId: designId 
      }, { headers })
        .pipe(
          catchError(this.handleError)
        );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Obtener el diseño apropiado según el tipo de documento
   */
  getDesignForDocumentType(documentType: DocumentType, settings?: DesignSettings): string {
    if (!settings) {
      settings = this.defaultSettings;
    }
    
    switch (documentType) {
      case DocumentType.INVOICE:
        return settings.invoiceDesignId || 'classic';
      case DocumentType.DELIVERY_NOTE:
        return settings.deliveryNoteDesignId || 'classic-delivery';
      case DocumentType.SALES_ORDER:
        return settings.deliveryNoteDesignId || 'classic-delivery';
      case DocumentType.QUOTE:
        return settings.quoteDesignId || 'classic-quote';
      default:
        return 'classic';
    }
  }

  /**
   * Obtener todos los diseños disponibles para un tipo de documento
   */
  getAvailableDesignsForType(documentType: DocumentType): {id: string, name: string}[] {
    switch(documentType) {
      case DocumentType.INVOICE:
        return this.availableDesigns.invoice;
      case DocumentType.DELIVERY_NOTE:
        return this.availableDesigns.deliveryNote;
      case DocumentType.QUOTE:
        return this.availableDesigns.quote;
      default:
        console.warn('Tipo de documento desconocido:', documentType);
        return [];
    }
  }

  /**
   * Obtener el nombre amigable de un diseño según su ID y tipo
   */
  getDesignName(designId: string, documentType: DocumentType): string {
    const designs = this.getAvailableDesignsForType(documentType);
    const design = designs.find(d => d.id === designId);
    return design ? design.name : 'Desconocido';
  }

  private handleError(error: any) {
    console.error('Error en la solicitud:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }

  // ⭐ MÉTODO HELPER PARA OBTENER SETTINGS DE FORMA SÍNCRONA
  async getSettings(): Promise<DesignSettings> {
    try {
      return await this.getUserDesignSettings().toPromise() || this.defaultSettings;
    } catch (error) {
      console.error('Error obteniendo settings:', error);
      return this.defaultSettings;
    }
  }
}