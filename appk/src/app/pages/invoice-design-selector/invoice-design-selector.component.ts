import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentType } from '../../shared/enums/document-type.enum';
import { DesignSettingsService } from '../../services/design-settings.service';
import { Sweetalert } from '../../functions';

export interface InvoiceDesign {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  isDefault?: boolean;
  documentType: DocumentType;
}

@Component({
    selector: 'app-invoice-design-selector',
    templateUrl: './invoice-design-selector.component.html',
    styleUrls: ['./invoice-design-selector.component.css'],
    standalone: false
})
export class InvoiceDesignSelectorComponent implements OnInit {
  @Input() currentInvoiceDesignId: string = '';
  @Input() currentDeliveryNoteDesignId: string = '';
  @Input() currentQuoteDesignId: string = '';
  
  
  @Output() designSelected = new EventEmitter<{type: DocumentType, designId: string}>();

  currentDocumentType: DocumentType = DocumentType.INVOICE;
  
  // Designs for each document type
  selectedDesigns: {[key in DocumentType]: string} = {
    [DocumentType.INVOICE]: '',
    [DocumentType.DELIVERY_NOTE]: '',
    [DocumentType.QUOTE]: '',
    [DocumentType.SALES_ORDER]: '',
    
  };

  // All available designs
  availableDesigns: InvoiceDesign[] = [
    // Facturas (Invoice designs)
    {
      id: 'classic',
      name: 'Clásico',
      description: 'Diseño tradicional con bordes y formato estándar',
      previewImage: 'assets/images/designs/invoice.png',
      isDefault: true,
      documentType: DocumentType.INVOICE
    },
    {
      id: 'modern',
      name: 'Moderno',
      description: 'Diseño limpio con colores vibrantes y estilo contemporáneo',
      previewImage: 'assets/images/designs/invoice2.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'minimal',
      name: 'Minimalista',
      description: 'Diseño simple y elegante con espacios amplios',
      previewImage: 'assets/images/designs/invoice3.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'professional',
      name: 'Profesional',
      description: 'Diseño formal para empresas con estilo corporativo',
      previewImage: 'assets/images/designs/invoice4.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'creative',
      name: 'Creativo',
      description: 'Diseño colorido ideal para negocios creativos',
      previewImage: 'assets/images/designs/invoice5.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'elegant',
      name: 'Elegante',
      description: 'Diseño sofisticado con franjas diagonales en azul',
      previewImage: 'assets/images/designs/elegant.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'aqua',
      name: 'Aqua',
      description: 'Diseño minimalista con panel lateral turquesa',
      previewImage: 'assets/images/designs/aqua.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'simple',
      name: 'Simple',
      description: 'Diseño ultra minimalista en blanco y beige',
      previewImage: 'assets/images/designs/simple.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Diseño ejecutivo en rojo corporativo con footer angular',
      previewImage: 'assets/images/designs/corporate.png',
      documentType: DocumentType.INVOICE
    },
    {
      id: 'wave',
      name: 'Wave',
      description: 'Diseño elegante con olas decorativas en morado',
      previewImage: 'assets/images/designs/wave.png',
      documentType: DocumentType.INVOICE
    },
    
    // Notas de remisión (Delivery note designs)
    {
  id: 'classic-delivery',
  name: 'Clásico',
  description: 'Diseño tradicional para notas de remisión',
  previewImage: 'assets/images/designs/remision6.png',
  isDefault: true,
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'modern-delivery',
  name: 'Moderno',
  description: 'Diseño moderno para notas de remisión',
  previewImage: 'assets/images/designs/remision2.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'creative-delivery',
  name: 'Creativo',
  description: 'Diseño creativo con elementos geométricos azules',
  previewImage: 'assets/images/designs/remision.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'minimal-delivery',
  name: 'Minimalista',
  description: 'Diseño minimalista para notas de remisión',
  previewImage: 'assets/images/designs/remision4.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'profesional-delivery',
  name: 'Profesional',
  description: 'Diseño profesional para notas de remisión',
  previewImage: 'assets/images/designs/remision3.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'simple-delivery',
  name: 'Simple',
  description: 'Diseño elegante minimalista en tonos beige',
  previewImage: 'assets/images/designs/simple.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'elegant-delivery',
  name: 'Elegant',
  description: 'Diseño sofisticado blanco y negro con elementos decorativos',
  previewImage: 'assets/images/designs/elegant.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'wave-delivery',
  name: 'Wave',
  description: 'Diseño moderno morado con icono de ubicación',
  previewImage: 'assets/images/designs/wave.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'orange-delivery',
  name: 'Orange',
  description: 'Diseño corporativo limpio en naranja y gris',
  previewImage: 'assets/images/designs/orange.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    {
  id: 'friendly-delivery',
  name: 'Friendly',
  description: 'Diseño retro amigable azul y naranja con burbujas',
  previewImage: 'assets/images/designs/friendly.png',
  documentType: DocumentType.DELIVERY_NOTE
    },
    
    // Cotizaciones (Quote designs)
    {
      id: 'classic-quote',
      name: 'Clásico',
      description: 'Diseño tradicional para cotizaciones',
      previewImage: 'assets/images/designs/cotizacion2.png',
      isDefault: true,
      documentType: DocumentType.QUOTE
    },
    {
      id: 'modern-quote',
      name: 'Moderno',
      description: 'Diseño moderno para cotizaciones',
      previewImage: 'assets/images/designs/cotizacion3.png',
      documentType: DocumentType.QUOTE
    },
    {
      id: 'professional-quote',
      name: 'Profesional',
      description: 'Diseño profesional para cotizaciones',
      previewImage: 'assets/images/designs/cotizacion4.png',
      documentType: DocumentType.QUOTE
    },
    {
      id: 'minimal-quote',
      name: 'Minimalista',
      description: 'Diseño minimalista para cotizaciones',
      previewImage: 'assets/images/designs/cotizacion.png',
      documentType: DocumentType.QUOTE
    },
    {
      id: 'creative-quote',
      name: 'Creativo',
      description: 'Diseño creativo para cotizaciones',
      previewImage: 'assets/images/designs/cotizacion6.png',
      documentType: DocumentType.QUOTE
    },
    {
  id: 'formal-quote',
  name: 'Formal',
  description: 'Diseño formal y corporativo para cotizaciones',
  previewImage: 'assets/images/designs/formal.png',
  documentType: DocumentType.QUOTE
    },
    {
  id: 'blue-quote',
  name: 'Blue',
  description: 'Diseño corporativo en tonos azules',
  previewImage: 'assets/images/designs/blue.png',
  documentType: DocumentType.QUOTE
    },
    {
  id: 'clean-quote',
  name: 'Clean',
  description: 'Diseño limpio y minimalista para cotizaciones',
  previewImage: 'assets/images/designs/clean.png',
  documentType: DocumentType.QUOTE
    },
    {
  id: 'mint-quote',
  name: 'Mint',
  description: 'Diseño tecnológico con acentos en verde menta',
  previewImage: 'assets/images/designs/mint.png',
  documentType: DocumentType.QUOTE
    },
    {
  id: 'purpple-quote',
  name: 'Purpple',
  description: 'Diseño elegante y minimalista en tonos morados',
  previewImage: 'assets/images/designs/purpple.png',
  documentType: DocumentType.QUOTE
    }
  ];

  constructor(
    private designSettingsService: DesignSettingsService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadSavedSettings();
    
    // Initialize selected designs with input values or defaults
    this.selectedDesigns[DocumentType.INVOICE] = this.currentInvoiceDesignId || 
      this.getDefaultDesignId(DocumentType.INVOICE);
      
    this.selectedDesigns[DocumentType.DELIVERY_NOTE] = this.currentDeliveryNoteDesignId || 
      this.getDefaultDesignId(DocumentType.DELIVERY_NOTE);
      
    this.selectedDesigns[DocumentType.QUOTE] = this.currentQuoteDesignId || 
      this.getDefaultDesignId(DocumentType.QUOTE);      
    
  }

  // Cargar configuración desde la base de datos
  loadSavedSettings(): void {
    this.designSettingsService.getUserDesignSettings()
      .subscribe({
        next: (settings) => {
          if (settings.invoiceDesignId) {
            this.selectedDesigns[DocumentType.INVOICE] = settings.invoiceDesignId;
          } else {
            this.selectedDesigns[DocumentType.INVOICE] = this.getDefaultDesignId(DocumentType.INVOICE);
          }
          
          if (settings.deliveryNoteDesignId) {
            this.selectedDesigns[DocumentType.DELIVERY_NOTE] = settings.deliveryNoteDesignId;
          } else {
            this.selectedDesigns[DocumentType.DELIVERY_NOTE] = this.getDefaultDesignId(DocumentType.DELIVERY_NOTE);
          }
          
          if (settings.quoteDesignId) {
            this.selectedDesigns[DocumentType.QUOTE] = settings.quoteDesignId;
          } else {
            this.selectedDesigns[DocumentType.QUOTE] = this.getDefaultDesignId(DocumentType.QUOTE);
          }
          
        },
        error: (error) => {
          console.error('Error al cargar configuración:', error);
          // Usar valores predeterminados
          this.selectedDesigns[DocumentType.INVOICE] = this.getDefaultDesignId(DocumentType.INVOICE);
          this.selectedDesigns[DocumentType.DELIVERY_NOTE] = this.getDefaultDesignId(DocumentType.DELIVERY_NOTE);
          this.selectedDesigns[DocumentType.QUOTE] = this.getDefaultDesignId(DocumentType.QUOTE);          
        }
      });
  }
  
  // Handle tab changes
  onTabChange(event: MatTabChangeEvent): void {
    switch (event.index) {
      case 0:
        this.currentDocumentType = DocumentType.INVOICE;
        break;
      case 1:
        this.currentDocumentType = DocumentType.DELIVERY_NOTE;
        break;
      case 2:
        this.currentDocumentType = DocumentType.QUOTE;
        break;
    }
  }
  
  getDesignsForCurrentType(): InvoiceDesign[] {
    return this.availableDesigns.filter(design => design.documentType === this.currentDocumentType);
  }
  
  isDesignSelected(designId: string): boolean {
    return this.selectedDesigns[this.currentDocumentType] === designId;
  }
  
  selectDesign(designId: string): void {
    this.selectedDesigns[this.currentDocumentType] = designId;
    
    Sweetalert.fnc('loading', 'Guardando configuración...', null);
    
    this.designSettingsService.saveDesignSetting(this.currentDocumentType, designId)
      .subscribe({
        next: (response) => {
          Sweetalert.fnc('close', '', null);
          Sweetalert.fnc('success', 'Diseño guardado correctamente', null);
          
          this.designSelected.emit({
            type: this.currentDocumentType,
            designId: designId
          });
        },
        error: (err) => {
          console.error('Error al guardar diseño:', err);
          Sweetalert.fnc('close', '', null);
          
          let errorMessage = 'Error al guardar el diseño';
          if (err instanceof Error) {
            errorMessage = err.message || errorMessage;
          }
          
          Sweetalert.fnc('error', errorMessage, null);
        }
      });
  }
  
  getDefaultDesignId(documentType: DocumentType): string {
    const defaultDesign = this.availableDesigns.find(
      design => design.documentType === documentType && design.isDefault
    );
    return defaultDesign ? defaultDesign.id : 
      this.availableDesigns.filter(design => design.documentType === documentType)[0]?.id || '';
  }
  
  getCurrentSelectedDesign(): InvoiceDesign | undefined {
    const currentDesignId = this.selectedDesigns[this.currentDocumentType];
    return this.availableDesigns.find(
      design => design.id === currentDesignId && design.documentType === this.currentDocumentType
    );
  }
  
  handleImageError(event: Event, design: InvoiceDesign): void {
    console.error(`Error loading image for design: ${design.name}`);
    (event.target as HTMLImageElement).src = 'assets/images/designs/invoice6.png';
  }
  
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      return error.error.message;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
  }
}