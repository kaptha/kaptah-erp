import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { DocumentGeneratorService } from '../../../services/document-generator.service';
import { DocumentType } from '../../../shared/enums/document-type.enum';
import { Sweetalert } from '../../../functions';

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.css']
})
export class DocumentPreviewComponent implements OnInit {
  @Input() documentType: DocumentType = DocumentType.INVOICE;
  @Input() documentData: any;
  @Input() designType: string = ''; // Diseño opcional específico
  
  @Output() closed = new EventEmitter<void>();
  
  @ViewChild('documentIframe') documentIframe!: ElementRef;
  
  documentHtml: string = '';
  isLoading: boolean = false;
  
  constructor(private documentGenerator: DocumentGeneratorService) { }

  ngOnInit(): void {
    this.generatePreview();
  }
  
  /**
   * Genera la vista previa del documento
   */
  generatePreview(): void {
    this.isLoading = true;
    
    // Si se proporciona un diseño específico, inclúyelo en los datos
    const data = { ...this.documentData };
    if (this.designType) {
      data.designType = this.designType;
    }
    
    this.documentGenerator.generateDocument(this.documentType, data)
      .subscribe({
        next: (html: string) => {
          this.documentHtml = html;
          this.isLoading = false;
          
          // Dar tiempo para que el iframe se renderice antes de ajustar
          setTimeout(() => {
            this.adjustIframeHeight();
          }, 300);
        },
        error: (error: Error) => {
          console.error('Error generando documento:', error);
          this.isLoading = false;
          Sweetalert.fnc('error', 'Error al generar la vista previa del documento', null);
        }
      });
  }
  
  /**
   * Ajusta la altura del iframe según el contenido
   */
  adjustIframeHeight(): void {
    try {
      const iframe = this.documentIframe.nativeElement;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (iframeDoc.body) {
        const height = iframeDoc.body.scrollHeight;
        iframe.style.height = height + 'px';
      }
    } catch (error) {
      console.error('Error al ajustar altura del iframe:', error);
    }
  }
  
  /**
   * Imprime el documento
   */
  printDocument(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Documento</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${this.documentHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      Sweetalert.fnc('error', 'No se pudo abrir la ventana de impresión. Por favor, verifica que no estén bloqueadas las ventanas emergentes.', null);
    }
  }
  
  /**
   * Descarga el documento como PDF
   */
  downloadAsPdf(): void {
  Sweetalert.fnc('loading', 'Generando PDF...', null);
  
  const generatePdf = async () => {
    try {
      // @ts-ignore: Ignorar errores de tipo para html2pdf.js
      const html2pdfModule = await import('html2pdf.js');
      // @ts-ignore: Ignorar errores de tipo para html2pdf.js
      const html2pdf = html2pdfModule.default;
      
      const element = document.createElement('div');
      element.innerHTML = this.documentHtml;
      
      const documentName = this.getDocumentName();
      
      const opt = {
        margin: [10, 15, 10, 15], // [top, right, bottom, left] en mm
        filename: documentName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // @ts-ignore: Ignorar errores de tipo para html2pdf.js
      html2pdf().from(element).set(opt).save().then(() => {
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
      // @ts-ignore: Ignorar errores de tipo para html2pdf.js
      }).catch((error: any) => {
        console.error('Error generando PDF:', error);
        Sweetalert.fnc('error', 'Error al generar el PDF', null);
      });
    } catch (error: any) {
      console.error('Error cargando html2pdf:', error);
      Sweetalert.fnc('error', 'Error al cargar el generador de PDF', null);
    }
  };
  
  generatePdf();
}
  
  /**
   * Obtiene un nombre descriptivo para el archivo PDF
   */
  private getDocumentName(): string {
    const date = new Date().toISOString().split('T')[0];
    let documentId = '';
    
    // Extraer ID según el tipo de documento
    switch (this.documentType) {
      case DocumentType.INVOICE:
        documentId = this.documentData.invoice?.id || '';
        return `Factura_${documentId}_${date}.pdf`;
      
      case DocumentType.DELIVERY_NOTE:
        documentId = this.documentData.note?.id || '';
        return `NotaRemision_${documentId}_${date}.pdf`;
      
      case DocumentType.QUOTE:
        documentId = this.documentData.quote?.id || '';
        return `Cotizacion_${documentId}_${date}.pdf`;
      
      default:
        return `Documento_${date}.pdf`;
    }
  }
  
  /**
   * Cierra la previsualización
   */
  close(): void {
    this.closed.emit();
  }
}