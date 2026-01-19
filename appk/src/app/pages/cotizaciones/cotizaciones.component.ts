import { Component, OnInit, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, map, tap} from 'rxjs/operators';
import { of, Observable, firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ModalCotComponent } from './modal-cot/modal-cot.component';
import { CotizacionesService, Cotizacion } from '../../services/cotizaciones.service';
import { ApibizService } from '../../services/apibiz.service';
import { DesignSettingsService } from '../../services/design-settings.service';
import { QuoteDocumentService } from '../../services/quote-document.service';
import { ProductService } from '../../services/inventory/product.service';
import { ServiceService } from '../../services/inventory/service.service';
import { Sweetalert } from '../../functions';
import { DocumentType } from '../../shared/enums/document-type.enum';
import { LogoService } from '../../services/logo.service';
import { SendQuotationDialogComponent } from './send-quotation-dialog/send-quotation-dialog.component';
@Component({
    selector: 'app-cotizaciones',
    templateUrl: './cotizaciones.component.html',
    styleUrls: ['./cotizaciones.component.css'],
    standalone: false
})
export class CotizacionesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'folio',
    'cliente',
    'fecha_creacion',
    'fecha_validez',
    'subtotal',
    'impuestos',
    'total',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Cotizacion>([]);
  isLoading = false;
  isMobile = false;
  
  // Clientes
  clientesMap: { [id: number]: string } = {};
  
  // Paginador móvil
  mobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private cotizacionesService: CotizacionesService,
    private apibizService: ApibizService,
    private snackBar: MatSnackBar,
    private quoteDocumentService: QuoteDocumentService,
    private designSettings: DesignSettingsService,
    private productService: ProductService,
    private serviceService: ServiceService,
    private logoService: LogoService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.cargarClientes();
    this.cargarCotizaciones();
    (window as any).descargarPDFEnServidor = this.descargarPDFEnServidor.bind(this);
  }
  ngOnDestroy() {
  
  // Limpiar la referencia
  delete (window as any).descargarPDFEnServidor;
}
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }
  
  // Cargar clientes para mostrar nombres en lugar de IDs
  cargarClientes() {
    this.apibizService.getClients().subscribe({
      next: (clientes) => {
        clientes.forEach(cliente => {
          this.clientesMap[cliente.ID] = cliente.nombre;
        });
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
      }
    });
  }
  
  // Obtener nombre de cliente por ID
  getNombreCliente(id: number): string {
    return this.clientesMap[id] || `Cliente ${id}`;
  }

  // Crud operations
  agregarCotizacion() {
    const dialogRef = this.dialog.open(ModalCotComponent, {
      width: '950px',
      data: {
        isEdit: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Datos obtenidos del modal para crear cotización:', result);
        
        this.cotizacionesService.createCotizacion(result).subscribe({
          next: (cotizacionCreada) => {
            console.log('Cotización creada exitosamente:', cotizacionCreada);
            this.cargarCotizaciones(); // Recargar la lista
            this.snackBar.open('Cotización creada exitosamente', 'Cerrar', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error al crear la cotización:', error);
            this.snackBar.open('Error al crear la cotización: ' + (error.message || 'Error desconocido'), 'Cerrar', {
              duration: 5000
            });
          }
        });
      }
    });
  }

  editarCotizacion(element: Cotizacion) {
    if (!element.id) {
      this.snackBar.open('ID de cotización no válido', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    this.cotizacionesService.getCotizacion(element.id).subscribe({
      next: (cotizacionCompleta) => {
        const dialogRef = this.dialog.open(ModalCotComponent, {
          width: '950px',
          data: {
            isEdit: true,
            cotizacion: cotizacionCompleta
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.cargarCotizaciones();
            this.snackBar.open('Cotización actualizada exitosamente', 'Cerrar', {
              duration: 3000
            });
          }
        });
      },
      error: (error) => {
        this.snackBar.open('Error al cargar los detalles de la cotización', 'Cerrar', {
          duration: 3000
        });
        console.error('Error:', error);
      }
    });
  }

  eliminarCotizacion(id: number) {
    if (confirm('¿Está seguro de eliminar esta cotización?')) {
      this.cotizacionesService.deleteCotizacion(id)
        .subscribe({
          next: () => {
            this.snackBar.open('Cotización eliminada exitosamente', 'Cerrar', {
              duration: 3000
            });
            this.cargarCotizaciones();
          },
          error: (error) => {
            this.snackBar.open('Error al eliminar la cotización', 'Cerrar', {
              duration: 3000
            });
            console.error('Error:', error);
          }
        });
    }
  }

  /**
   * Ver detalles de una cotización con PDF generado por backend
   */
  verDetalleBackend(cotizacion: Cotizacion) {
    if (!cotizacion.id) {
      Sweetalert.fnc('error', 'ID de cotización no válido', null);
      return;
    }

    Sweetalert.fnc('loading', 'Generando vista previa...', null);

    // Obtener el diseño seleccionado
    this.designSettings.getUserDesignSettings().subscribe({
      next: (settings) => {
        // Para cotizaciones, usar el diseño de cotizaciones
        let designId = settings.quoteDesignId || 'classic-quote';
        
        // Extraer solo el nombre del estilo (quitar el sufijo -quote)
        const estilo = designId.replace('-quote', '');
        
        console.log('🎨 Diseño completo:', designId);
        console.log('🎨 Estilo para template:', estilo);
        
        // Llamar al backend para obtener el PDF generado con Puppeteer
        this.cotizacionesService.descargarPDF(cotizacion.id!, estilo).subscribe({
          next: (pdfBlob: Blob) => {
            Sweetalert.fnc('close', '', null);

            const fileURL = URL.createObjectURL(pdfBlob);
            window.open(fileURL, '_blank');
          },
          error: (error) => {
            Sweetalert.fnc('error', 'Error al generar la vista previa.', null);
            console.error('Error generando PDF:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error obteniendo configuración:', error);
        
        // Fallback: usar el diseño por defecto
        const estiloFallback = 'minimal';
        
        this.cotizacionesService.descargarPDF(cotizacion.id!, estiloFallback).subscribe({
          next: (pdfBlob: Blob) => {
            Sweetalert.fnc('close', '', null);
            const fileURL = URL.createObjectURL(pdfBlob);
            window.open(fileURL, '_blank');
          },
          error: (error) => {
            Sweetalert.fnc('error', 'Error al generar la vista previa.', null);
            console.error('Error generando PDF:', error);
          }
        });
      }
    });
  }

  /**
   * Descarga una cotización como PDF usando el backend
   */
  descargarPDFBackend(cotizacion: Cotizacion) {
    if (!cotizacion.id) {
      Sweetalert.fnc('error', 'ID de cotización no válido', null);
      return;
    }

    // Obtener la configuración de diseños del usuario
    this.designSettings.getUserDesignSettings().subscribe({
      next: (settings) => {
        // Para cotizaciones, usar el diseño de cotizaciones
        let designId = settings.quoteDesignId || 'classic-quote';
        
        // Extraer solo el nombre del estilo
        const estilo = designId.replace('-quote', '');
        
        this.cotizacionesService.descargarPDF(cotizacion.id!, estilo).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cotizacion_${cotizacion.id}_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
          },
          error: (error) => {
            console.error('Error al descargar el PDF:', error);
            Sweetalert.fnc('error', 'Error al descargar el PDF', null);
          }
        });
      },
      error: (error) => {
        console.error('Error obteniendo configuración:', error);
        Sweetalert.fnc('error', 'Error al obtener configuración', null);
      }
    });
  }

  
  // Utilidades de la tabla
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
     this.dataSource.filterPredicate = (data: Cotizacion, filter: string) => {
    const searchStr = filter.toLowerCase();
    const clienteNombre = this.getNombreCliente(data.clienteId)?.toLowerCase() || '';
    const estado = this.getEstadoTexto(data.estado)?.toLowerCase() || '';
    
    return (
      data.folio?.toLowerCase().includes(searchStr) ||
      clienteNombre.includes(searchStr) ||
      data.total?.toString().includes(searchStr) ||
      estado.includes(searchStr)
    );
  };

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Reset mobile pagination
    this.mobilePaginator.pageIndex = 0;
  }

 
  refrescar() {
    this.cargarCotizaciones();
  }
  
  
  getEstadoClass(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'status-pendiente';
      case 'aprobada':
        return 'status-aprobada';
      case 'rechazada':
        return 'status-rechazada';
      default:
        return '';
    }
  }
  
  getEstadoClassMobile(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'pendiente';
      case 'aprobada':
        return 'aprobada';
      case 'rechazada':
        return 'rechazada';
      default:
        return '';
    }
  }
  
  getEstadoTexto(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  }
  descargarPDFEnServidor(html: string) {
    Sweetalert.fnc('loading', 'Generando PDF...', null);
    
    // URL del endpoint que creamos en el backend
    const apiUrl = 'http://localhost:3000/api/pdf/generate';
    
    this.http.post(apiUrl, { html }, {
      responseType: 'blob'
    }).subscribe({
      next: (response: Blob) => {
        Sweetalert.fnc('close', '', null);
        
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        
        // Nombre del archivo
        const fileName = `Cotizacion_${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      },
      error: (error) => {
        console.error('Error al generar PDF en el servidor:', error);
        Sweetalert.fnc('error', 'Error al generar el PDF', null);
      }
    });
  }

  /**
   * Carga las cotizaciones desde el servicio
   */
  private cargarCotizaciones() {
    this.isLoading = true;
    this.cotizacionesService.getCotizaciones()
      .pipe(
        catchError((error) => {
          this.handleError(error);
          return of([]);
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: any) => {
          // ✅ Extraer el array de cotizaciones de la respuesta
          const cotizaciones = response.data || response;
          console.log('📦 Cotizaciones cargadas:', cotizaciones);
          
          this.dataSource.data = cotizaciones;
          this.dataSource.filterPredicate = this.createFilter();
          
          // Resetear el paginador móvil
          this.mobilePaginator.pageIndex = 0;
        }
      });
  }
  
  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: Cotizacion, filter: string) => boolean {
    return (data: Cotizacion, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.id?.toString(),
        this.getNombreCliente(data.clienteId),
        data.fechaCreacion?.toString(),
        data.fechaValidez?.toString(),
        data.estado,
        data.total?.toString(),
        data.moneda
      ].map(value => value?.toLowerCase() || '');
      
      // Comprobar que todos los términos de búsqueda existen en algún campo
      return searchTerms.every(term => 
        searchableData.some(value => value.includes(term))
      );
    };
  }
  
  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en CotizacionesComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar las cotizaciones';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }

  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
  }
  /**
 * Procesa el item encontrado o crea uno genérico
 */
private procesarItemEncontrado(item: any, cotizacionCompleta: Cotizacion): void {
  if (item) {
    // Crear un item basado en el producto/servicio encontrado
    const nuevoItem = {
      cantidad: 1,
      descripcion: item.name || item.description || 'HP recoger',
      precioUnitario: item.price || (cotizacionCompleta.subtotal || 15000),
      total: item.price || (cotizacionCompleta.subtotal || 15000),
      tipo: item.type || 'servicio',
      descuento: 0,
      impuestos: cotizacionCompleta.impuestos || 0,
      subtotal: item.price || (cotizacionCompleta.subtotal || 15000)
    };
    
    // Agregar el item a la cotización
    cotizacionCompleta.items = [nuevoItem];
  } else {
    // Crear un item genérico si no se encontró ningún producto/servicio
    cotizacionCompleta.items = [{
      cantidad: 1,
      descripcion: cotizacionCompleta.observaciones || 'HP recoger',
      precioUnitario: cotizacionCompleta.subtotal || 15000,
      total: cotizacionCompleta.subtotal || 15000,
      tipo: 'servicio',
      descuento: 0,
      impuestos: cotizacionCompleta.impuestos || 0,
      subtotal: cotizacionCompleta.subtotal || 15000
    }];
  }
  
  console.log('Items agregados:', cotizacionCompleta.items);
  this.generarVistaPrevia(cotizacionCompleta);
}
  
 /**
 * Ver detalle de cotización con vista previa en PDF
 */
verDetalles(cotizacion: Cotizacion) {
  if (!cotizacion.id) {
    this.snackBar.open('ID de cotización no válido', 'Cerrar', {
      duration: 3000
    });
    return;
  }
  
  Sweetalert.fnc('loading', 'Generando vista previa...', null);
  
  // Obtener la cotización completa con sus ítems
  this.cotizacionesService.getCotizacion(cotizacion.id).subscribe({
    next: (cotizacionCompleta) => {
      // Verificar si hay items en la cotización
      if (!cotizacionCompleta.items || cotizacionCompleta.items.length === 0) {
        console.log('No se encontraron items en la cotización. Agregando items de prueba...');
        
        // Guardar el ID en una variable y verificar que sea un número
        const cotizacionId = cotizacionCompleta.id;
        
        if (typeof cotizacionId === 'number') {
          // Ahora TypeScript sabe que cotizacionId es definitivamente un número
          this.obtenerProductoPorId(cotizacionId).pipe(
            catchError(() => {
              // Si falla, intentar obtener un servicio
              return this.obtenerServicioPorId(cotizacionId); // Ahora esto es seguro
            }),
            catchError(() => {
              // Si ambos fallan, crear un item genérico
              return of(null);
            })
          ).subscribe(item => {
            this.procesarItemEncontrado(item, cotizacionCompleta);
          });
        } else {
          // Si no hay ID válido, crear un item genérico directamente
          this.procesarItemEncontrado(null, cotizacionCompleta);
        }
      } else {
        // Si hay items, continuar normalmente
        this.generarVistaPrevia(cotizacionCompleta);
      }
    },
    error: (error) => {
      Sweetalert.fnc('error', 'Error al cargar los detalles de la cotización', null);
      console.error('Error:', error);
    }
  });
}

// Métodos auxiliares para obtener productos y servicios por ID
private obtenerProductoPorId(id: number): Observable<any> {
  return this.productService.getProducts().pipe(
    map(products => products.find(p => p.id === id)),
    tap(product => console.log('Producto encontrado:', product))
  );
}

private obtenerServicioPorId(id: number): Observable<any> {
  return this.serviceService.getServices().pipe(
    map(services => services.find(s => s.id === id)),
    tap(service => console.log('Servicio encontrado:', service))
  );
}

// Método para generar vista previa (extraído del método verDetalles original)
private async generarVistaPrevia(cotizacionCompleta: Cotizacion) {
  try {
    // 1. Cargar el logo como base64
    let logoBase64 = '';
    try {
      console.log('Intentando cargar logo...');
      // Si estás usando RxJS 7+, usa firstValueFrom en lugar de toPromise
      // import { firstValueFrom } from 'rxjs';
      const logoResponse = await firstValueFrom(this.logoService.getLogo());
      console.log('Respuesta del logo:', logoResponse);
      if (logoResponse && logoResponse.url) {
        console.log('URL del logo encontrada:', logoResponse.url);
        try {
          logoBase64 = await this.convertImageToBase64(logoResponse.url);
          console.log('Logo convertido a base64, longitud:', logoBase64.length);
        } catch (base64Error) {
          console.error('Error convirtiendo a base64:', base64Error);
        }
      } else {
        console.warn('No se encontró URL del logo en la respuesta');
      }
    } catch (logoError) {
      console.warn('Error cargando logo:', logoError);
    }

    // 2. Obtener información adicional (tu código existente)
    const companyInfo = this.getCompanyInfo();
    
    // 3. Obtener el diseño preferido (tu código existente)
    this.designSettings.getUserDesignSettings().subscribe({
      next: (settings) => {
        const designType = this.designSettings.getDesignForDocumentType(DocumentType.QUOTE, settings);
        
        // 4. Preparar datos incluyendo el logo base64
        const documentData = {
          cotizacion: {
            ...cotizacionCompleta,
            companyName: companyInfo.name,
            companyPhone: companyInfo.phone,
            companyEmail: companyInfo.email,
            clienteNombre: this.getNombreCliente(cotizacionCompleta.clienteId),
            descripcionProyecto: cotizacionCompleta.observaciones || '',
            items: cotizacionCompleta.items,
            // Añadir el logo base64
            logoBase64: logoBase64
          },
          designType: designType
        };
        
        // 5. Generar el documento HTML (tu código existente)
        this.quoteDocumentService.generateQuoteDocument(documentData, designType)
          .subscribe({
            next: (html: string) => {
              // 6. Modificar el HTML para asegurar que el logo se muestra
              if (logoBase64) {
                // Reemplazar cualquier imagen de logo por la versión base64
                const logoRegex = /<img[^>]*src="[^"]*logo[^"]*"[^>]*>/gi;
                html = html.replace(logoRegex, `<img src="${logoBase64}" alt="Logo" class="logo-image" style="max-width: 150px;">`);
                
                // O reemplazar un marcador específico si existe
                html = html.replace('{{LOGO_URL}}', logoBase64);
              }
              
              // 7. Continuar con la lógica existente para mostrar el HTML
              Sweetalert.fnc('close', '', null);
              
              // Abrir el HTML en una nueva pestaña (tu código existente)
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.open();
                // Aquí va el HTML generado por el servicio
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Vista Previa - Cotización ${cotizacionCompleta.id}</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      @media screen {
                        html, body { 
                          margin: 0; 
                          padding: 0;
                          background-color: #f5f5f5;
                          font-family: Arial, sans-serif;
                        }
                        .content-wrapper {
                          padding: 20px;
                        }
                        .page-container {
                          background: white;
                          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                          margin: 60px auto 20px;
                          max-width: 210mm;
                          min-height: 297mm;
                          padding: 15mm;
                          box-sizing: border-box;
                        }
                        /* Asegurar que las imágenes de logo se muestren correctamente */
                        .logo-image {
                          max-width: 150px;
                          max-height: 100px;
                          object-fit: contain;
                        }
                      }
                      
                      /* Resto de tus estilos... */
                    </style>
                  </head>
                  <body>
                    <!-- Resto de tu código HTML... -->
                    <div class="content-wrapper">
                      <div class="page-container">
                        ${html}
                      </div>
                    </div>
                    
                    <!-- Resto de tu código... -->
                  </body>
                  </html>
                `);
                newWindow.document.close();
              } else {
                Sweetalert.fnc('error', 'No se pudo abrir la ventana de vista previa. Por favor, verifica que no estén bloqueadas las ventanas emergentes.', null);
              }
            },
            error: (error: Error) => {
              console.error('Error generando documento:', error);
              Sweetalert.fnc('error', 'Error al generar la vista previa: ' + error.message, null);
            }
          });
      },
      error: (error: Error) => {
        console.error('Error obteniendo configuraciones de diseño:', error);
        Sweetalert.fnc('error', 'Error al obtener configuraciones: ' + error.message, null);
      }
    });
  } catch (error) {
    console.error('Error en generarVistaPrevia:', error);
    Sweetalert.fnc('error', 'Error al preparar la vista previa', null);
  }
}
  
  /**
   * Descargar PDF de cotización
   */
  async descargarPDF(cotizacion: Cotizacion) {
  if (!cotizacion.id) {
    this.snackBar.open('ID de cotización no válido', 'Cerrar', {
      duration: 3000
    });
    return;
  }
  
  Sweetalert.fnc('loading', 'Generando PDF...', null);
  
  try {
    // 1. Cargar el logo como base64
    let logoBase64 = '';
    try {
      const logoResponse = await firstValueFrom(this.logoService.getLogo());
      if (logoResponse && logoResponse.url) {
        logoBase64 = await this.convertImageToBase64(logoResponse.url);
        console.log('Logo cargado correctamente como base64');
      }
    } catch (logoError) {
      console.warn('Error cargando logo, continuando sin él:', logoError);
    }
    
    // 2. Obtener la cotización completa (mantenemos tu código existente)
    this.cotizacionesService.getCotizacion(cotizacion.id).subscribe({
      next: (cotizacionCompleta) => {
        // Obtener información adicional si es necesario
        const companyInfo = this.getCompanyInfo();
        
        // Obtener el diseño preferido del usuario para cotizaciones
        this.designSettings.getUserDesignSettings().subscribe({
          next: (settings) => {
            const designType = this.designSettings.getDesignForDocumentType(DocumentType.QUOTE, settings);
            
            // Preparar datos para la generación del documento
            const documentData = {
              cotizacion: {
                ...cotizacionCompleta,
                companyName: companyInfo.name,
                companyPhone: companyInfo.phone,
                companyEmail: companyInfo.email,
                clienteNombre: this.getNombreCliente(cotizacionCompleta.clienteId),
                // Mapear los items si es necesario
                items: cotizacionCompleta.items || [],
                // Añadir el logo como base64
                logoBase64: logoBase64
              },
              designType: designType
            };
            
            // Generar el documento HTML
            this.quoteDocumentService.generateQuoteDocument(documentData, designType)
              .subscribe({
                next: (html: string) => {
                  // 3. Reemplazar cualquier referencia a URL de logo con la versión base64
                  if (logoBase64) {
                    // Buscar cualquier imagen que contenga "logo" en su src y reemplazarla
                    const logoRegex = /<img[^>]*src="[^"]*logo[^"]*"[^>]*>/gi;
                    html = html.replace(logoRegex, `<img src="${logoBase64}" alt="Logo" style="max-width: 150px;">`);
                    
                    // O si tienes un marcador específico
                    html = html.replace('{{LOGO_URL}}', logoBase64);
                  }
                  
                  // 4. Agregar una pausa para asegurar que el DOM se actualice
                  setTimeout(() => {
                    // Convertir HTML a PDF
                    this.generatePdf(html, `Cotizacion_${cotizacion.id}`);
                    this.cdr.detectChanges();
                  }, 100);
                },
                error: (error: Error) => {
                  console.error('Error generando documento:', error);
                  Sweetalert.fnc('error', 'Error al generar el documento: ' + error.message, null);
                }
              });
          },
          error: (error: Error) => {
            console.error('Error obteniendo configuraciones de diseño:', error);
            Sweetalert.fnc('error', 'Error al obtener configuraciones: ' + error.message, null);
          }
        });
      },
      error: (error) => {
        Sweetalert.fnc('error', 'Error al cargar los detalles de la cotización', null);
        console.error('Error:', error);
      }
    });
  } catch (error) {
    console.error('Error general:', error);
    Sweetalert.fnc('error', 'Error inesperado al generar PDF', null);
  }
}

// Método para convertir imagen a base64
private async convertImageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Importante para CORS
    
    img.onload = () => {
      // Crear un canvas para dibujar la imagen
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Dibujar la imagen en el canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Convertir a base64
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } else {
        reject('No se pudo obtener el contexto 2D del canvas');
      }
    };
    
    img.onerror = (error) => {
      console.error('Error cargando imagen:', error);
      reject('Error al cargar la imagen');
    };
    
    // Establecer la fuente de la imagen
    img.src = url;
    
    // Por si acaso, establecer un tiempo máximo de espera
    setTimeout(() => {
      if (!img.complete) {
        reject('Tiempo de espera agotado al cargar la imagen');
      }
    }, 10000);
  });
}

// Actualizar también el método generatePdf
private generatePdf(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        // Crear un contenedor para el HTML
        const element = document.createElement('div');
        element.innerHTML = html;
        
        // Añadir el elemento al DOM temporalmente para que las imágenes se carguen correctamente
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);
        
        // Esperar a que las imágenes se carguen
        await this.waitForImages(element);
        
        // Configuración optimizada
        const opt = {
          margin: 10,
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          }
        };
        
        try {
          // Crear el PDF
          await html2pdf().from(element).set(opt).save();
          
          // Limpiar
          document.body.removeChild(element);
          Sweetalert.fnc('close', '', null);
          Sweetalert.fnc('success', 'PDF generado correctamente', null);
        } catch (pdfError) {
          console.error('Error específico de html2pdf:', pdfError);
          document.body.removeChild(element);
          
          // Usar instanceof para evitar el error TS18046
          const errorMessage = pdfError instanceof Error 
            ? pdfError.message 
            : 'Error desconocido';
            
          Sweetalert.fnc('error', 'Error al generar el PDF: ' + errorMessage, null);
        }
      } catch (error) {
        console.error('Error cargando html2pdf:', error);
        Sweetalert.fnc('error', 'Error al cargar el generador de PDF', null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('Error general en generación de PDF:', error);
    Sweetalert.fnc('error', 'Error general al generar el PDF', null);
  }
}

// Método auxiliar para esperar a que las imágenes se carguen
private waitForImages(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const images = Array.from(element.querySelectorAll('img'));
    
    // Si no hay imágenes, resolver inmediatamente
    if (images.length === 0) {
      resolve();
      return;
    }
    
    let loadedImages = 0;
    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === images.length) {
        resolve();
      }
    };
    
    // Esperar a que cada imagen se cargue o falle
    images.forEach(img => {
      if (img.complete) {
        onImageLoad();
      } else {
        img.onload = onImageLoad;
        img.onerror = () => {
          console.warn('Error loading image:', img.src);
          onImageLoad();
        };
      }
    });
    
    // Por si acaso, establecer un tiempo máximo de espera
    setTimeout(resolve, 5000);
  });
}
  
  
  
  /**
   * Obtiene información de la empresa
   */
  private getCompanyInfo(): any {
    // Aquí deberías obtener la información de la empresa desde un servicio o localStorage
    // Por ahora se usa un valor predeterminado
    return {
      name: 'Tu Empresa',
      phone: '(123) 456-7890',
      email: 'contacto@tuempresa.com',
      address: 'Calle Principal #123, Ciudad',
      logo: '/assets/images/logo.png'
    };
  }
  
  /**
   * Exporta las cotizaciones a formato CSV o Excel
   */
  exportar(format: string = 'xlsx') {
    if (this.dataSource.data.length === 0) {
      Sweetalert.fnc('info', 'No hay datos para exportar', null);
      return;
    }

    try {
      // Crear datos para exportar
      const data = this.dataSource.data.map(cotizacion => ({
        'Folio': cotizacion.folio || '',
        'Cliente': this.getNombreCliente(cotizacion.clienteId) || '',
        'Fecha Creación': cotizacion.fechaCreacion ? new Date(cotizacion.fechaCreacion).toLocaleString() : '',
        'Fecha Validez': cotizacion.fechaValidez ? new Date(cotizacion.fechaValidez).toLocaleString() : '',
        'Subtotal': cotizacion.subtotal || 0,
        'Impuestos': cotizacion.impuestos || 0,
        'Total': cotizacion.total || 0,
        'Moneda': cotizacion.moneda || '',
        'Estado': this.getEstadoTexto(cotizacion.estado) || '',
        'Observaciones': cotizacion.observaciones || '',
        'Fecha de Creación': cotizacion.createdAt ? new Date(cotizacion.createdAt).toLocaleString() : '',
        'Última Actualización': cotizacion.updatedAt ? new Date(cotizacion.updatedAt).toLocaleString() : ''
      }));

      // Crear el libro y hoja
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizaciones');

      // Ajustar anchos de columna
      const columnsWidths = [
        { wch: 15 }, // ID Cotización
        { wch: 30 }, // Cliente
        { wch: 20 }, // Fecha Creación
        { wch: 20 }, // Fecha Validez
        { wch: 15 }, // Subtotal
        { wch: 15 }, // Impuestos
        { wch: 15 }, // Total
        { wch: 10 }, // Moneda
        { wch: 12 }, // Estado
        { wch: 30 }, // Observaciones
        { wch: 20 }, // Fecha de Creación
        { wch: 20 }  // Última Actualización
      ];
      worksheet['!cols'] = columnsWidths;

      const fileName = `cotizaciones_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Exportar como CSV
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        this.downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
      } else {
        // Exportar como Excel
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }

      Sweetalert.fnc('success', `Exportación a ${format.toUpperCase()} completada`, null);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      Sweetalert.fnc('error', 'Error al exportar los datos', null);
    }
  }

  /**
   * Descarga el archivo generado (para CSV)
   */
  private downloadFile(content: string, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  /**
 * Enviar cotización por email
 */
enviarPorEmail(cotizacion: any): void {
  const dialogRef = this.dialog.open(SendQuotationDialogComponent, {
    width: '500px',
    data: {
      cotizacionId: cotizacion.id,
      clientName: this.getNombreCliente(cotizacion.clienteId),
      defaultEmail: ''
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const loadingSnack = this.snackBar.open('Enviando cotización...', '', {
        duration: 0
      });

      this.cotizacionesService.sendQuotationByEmail(cotizacion.id, result).subscribe({
        next: (response) => {
          loadingSnack.dismiss();
          
          Swal.fire({
            icon: 'success',
            title: '¡Email Enviado!',
            text: response.message || 'La cotización se envió exitosamente',
            confirmButtonColor: '#7F3FF0',
          });
        },
        error: (error) => {
          loadingSnack.dismiss();
          console.error('Error enviando email:', error);
          
          Swal.fire({
            icon: 'error',
            title: 'Error al Enviar',
            text: error.error?.message || 'No se pudo enviar el email',
            confirmButtonColor: '#7F3FF0',
          });
        }
      });
    }
  });
}
  
  // Funciones para el paginador móvil
  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }
  
  getMobileEndIndex(): number {
    const endIndex = (this.mobilePaginator.pageIndex + 1) * this.mobilePaginator.pageSize;
    return Math.min(endIndex, this.dataSource.filteredData.length);
  }
  
  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }
  
  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }
  
  isLastMobilePage(): boolean {
    const maxPageIndex = Math.ceil(this.dataSource.filteredData.length / this.mobilePaginator.pageSize) - 1;
    return this.mobilePaginator.pageIndex >= maxPageIndex;
  }
}