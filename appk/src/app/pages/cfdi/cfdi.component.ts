import { Component, OnInit, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { CFDIService } from '../../services/cfdi.service';
import { Sweetalert } from '../../functions';
import { DesignSettingsService } from '../../services/design-settings.service';
import { DocumentType } from '../../shared/enums/document-type.enum';
import { CFDI } from '../../models/cfdi.model';
import { AddCfdiModalComponent } from './add-cfdi-modal/add-cfdi-modal.component';
import { AddCfdiNominaModalComponent } from './add-cfdi-nomina-modal/add-cfdi-nomina-modal.component';
import { AddCfdiPagoModalComponent } from './add-cfdi-pago-modal/add-cfdi-pago-modal.component';
interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-cfdi',
    templateUrl: './cfdi.component.html',
    styleUrls: ['./cfdi.component.css'],
    standalone: false
})
export class CFDIComponent implements OnInit {
  // Propiedades del componente
  cfdis: CFDI[] = [];
  dataSource = new MatTableDataSource<CFDI>([]);
  displayedColumns: string[] = ['serie', 'folio', 'fecha', 'tipo', 'cliente', 'total', 'estado', 'actions'];
  loading: boolean = false;
  isMobile = false;
  
  // Paginador móvil
  mobilePaginator: MobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };
  
  constructor(
    private dialog: MatDialog, 
    private cfdiService: CFDIService,
    private designSettingsService: DesignSettingsService
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.loadCFDIs();
  }

  /**
   * Detecta el tamaño de la pantalla para ajustar la vista
   */
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  /**
   * Carga los CFDI desde el servicio
   */
  loadCFDIs() {
  this.loading = true;
  this.cfdiService.getCFDIs().pipe(
    catchError((error) => {
      this.handleError(error);
      return of([]);
    }),
    finalize(() => {
      this.loading = false;
    })
  ).subscribe((data) => {
    this.cfdis = data;
    this.dataSource = new MatTableDataSource<CFDI>(this.cfdis);
    this.dataSource.filterPredicate = this.createFilter();
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  });
}

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: CFDI, filter: string) => boolean {
    return (data: CFDI, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.serie,
        data.folio,
        data.fecha,
        data.tipo,
        data.cliente.nombre,
        data.cliente.rfc,
        data.total.toString(),
        data.estado,
        data.uuid
      ].map(value => value?.toLowerCase() || '');
      
      // Comprobar que todos los términos de búsqueda existen en algún campo
      return searchTerms.every(term => 
        searchableData.some(value => value.includes(term))
      );
    };
  }

  /**
   * Aplicar filtro a la tabla
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Abre el diálogo para seleccionar el tipo de CFDI a crear
   */
  openCFDITypeSelector() {
    // Aquí implementaremos el menú desplegable con los tipos de CFDI
    // Por ahora, simplemente abriremos un diálogo genérico
    // this.openCFDIDialog();
  }

  // ✅ CFDI de Ingreso
  createIngresoCFDI() {
    this.dialog.open(AddCfdiModalComponent, {
      width: this.isMobile ? '95%' : '900px',
    maxWidth: this.isMobile ? '100vw' : '1200px',
    data: { isEditing: false, tipo: 'Ingreso' }
    });
  }

  /**
   * Abre el diálogo para crear un CFDI de nómina
   */
  createNominaCFDI() {
  console.log('Creando CFDI de Nómina');
  
  const dialogRef = this.dialog.open(AddCfdiNominaModalComponent, {
    width: this.isMobile ? '95%' : '900px',
    maxWidth: this.isMobile ? '100vw' : '1200px',
    data: { isEditing: false, tipo: 'Nomina' }
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log('Diálogo de Nómina cerrado con resultado:', result);
    if (result) {
      this.saveCFDINomina(result);
    }
  });
}

 
  private saveCFDINomina(cfdiData: any) {
  this.loading = true;
  this.cfdiService.createCFDINomina(cfdiData) // Asegúrate de tener este método en tu servicio
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (newCFDI) => {
        Sweetalert.fnc('success', 'CFDI de Nómina creado correctamente', null);
        this.loadCFDIs();
      },
      error: (error) => {
        console.error('Error al crear CFDI de Nómina:', error);
        Sweetalert.fnc('error', 'Error al crear el CFDI de Nómina', null);
      }
    });
}
createPagoCFDI() {
  console.log('Creando CFDI de Recepción de Pago');
  
  const dialogRef = this.dialog.open(AddCfdiPagoModalComponent, {
    width: this.isMobile ? '95%' : '900px',
    maxWidth: this.isMobile ? '100vw' : '1200px',
    data: { isEditing: false, tipo: 'Pago' }
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log('Diálogo de Pago cerrado con resultado:', result);
    if (result) {
      this.saveCFDIPago(result);
    }
  });
}

// Añade este método para guardar el pago:
private saveCFDIPago(cfdiData: any) {
  this.loading = true;
  this.cfdiService.createCFDIPago(cfdiData)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (newCFDI) => {
        Sweetalert.fnc('success', 'CFDI de Recepción de Pago creado correctamente', null);
        this.loadCFDIs();
      },
      error: (error) => {
        console.error('Error al crear CFDI de Recepción de Pago:', error);
        Sweetalert.fnc('error', 'Error al crear el CFDI de Recepción de Pago', null);
      }
    });
}

  /**
   * Abre el diálogo para crear o editar un CFDI
   */
  openCFDIDialog(tipo?: 'Ingreso' | 'Egreso' | 'Nomina' | 'Pago', cfdi?: CFDI) {
  const dialogRef = this.dialog.open(AddCfdiNominaModalComponent, {
    width: this.isMobile ? '95%' : '800px',
    maxWidth: this.isMobile ? '100vw' : '1000px',
    data: cfdi 
      ? { ...cfdi, isEditing: true } 
      : { isEditing: false, tipo: tipo }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      if (result.ID) {
        this.updateCFDI(result);
      } else {
        this.createCFDI(result);
      }
    }
  });
}

  /**
 * Crea un nuevo CFDI
 */
private createCFDI(cfdiData: Omit<CFDI, 'ID'>) {
  // Asegúrate de que no haya una propiedad ID
  const { ID, ...cfdiDataWithoutId } = cfdiData as any;
  
  // ⭐ Determinar el tipo y llamar al método específico
  const tipo = cfdiData.tipo || 'Ingreso';
  
  this.loading = true;
  
  // ⭐ Llamar al método correcto según el tipo
  let serviceCall;
  switch (tipo) {
    case 'Ingreso':
      serviceCall = this.cfdiService.createIngresoCfdi(cfdiDataWithoutId);
      break;
    case 'Nomina':
      serviceCall = this.cfdiService.createCFDINomina(cfdiDataWithoutId);
      break;
    case 'Pago':
      serviceCall = this.cfdiService.createCFDIPago(cfdiDataWithoutId);
      break;
    default:
      serviceCall = this.cfdiService.createIngresoCfdi(cfdiDataWithoutId);
  }
  
  serviceCall
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (newCFDI) => {
        Sweetalert.fnc('success', 'CFDI creado correctamente', null);
        this.loadCFDIs();
      },
      error: (error) => {
        console.error('Error al crear CFDI:', error);
        Sweetalert.fnc('error', 'Error al crear el CFDI: ' + this.getErrorMessage(error), null);
      }
    });
}

  /**
   * Actualiza un CFDI existente
   */
  private updateCFDI(cfdiData: CFDI) {
  if (!cfdiData.ID) {
    console.error('ID de CFDI no válido');
    Sweetalert.fnc('error', 'Error: ID de CFDI no válido', null);
    return;
  }
  
  this.loading = true;
  this.cfdiService.updateCFDI(cfdiData.ID.toString(), cfdiData)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (updatedCFDI) => {
        // Actualizar el CFDI en la lista local
        const index = this.cfdis.findIndex(c => c.ID === updatedCFDI.ID);
        if (index !== -1) {
          this.cfdis[index] = updatedCFDI;
          this.dataSource.data = [...this.cfdis]; // Forzar detección de cambios
        }
        Sweetalert.fnc('success', 'CFDI actualizado correctamente', null);
      },
      error: (error) => {
        console.error('Error al actualizar CFDI:', error);
        Sweetalert.fnc('error', 'Error al actualizar el CFDI: ' + this.getErrorMessage(error), null);
      }
    });
}

  /**
   * Edita un CFDI existente
   */
  editCFDI(cfdi: CFDI) {
    this.openCFDIDialog(cfdi.tipo as any, cfdi);
  }

  /**
   * Elimina un CFDI
   */
  async deleteCFDI(event: Event, ID: string) {  // ⭐ Cambiar de number a string
  event.preventDefault();
  event.stopPropagation();
  
  // ⭐ Validar que sea un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  if (!ID || typeof ID !== 'string' || ID.trim() === '') {
    console.error('❌ ID de CFDI no válido:', ID);
    Sweetalert.fnc('error', 'Error: ID de CFDI no válido', null);
    return;
  }

  console.log('🗑️ Intentando eliminar CFDI con ID:', ID);

  const confirmed = await Sweetalert.confirmDelete(
    '¿Estás seguro?',
    '¿Quieres eliminar este CFDI? Esta acción no se puede deshacer.'
  );

  if (confirmed) {
    this.loading = true;
    Sweetalert.fnc('loading', 'Procesando solicitud...', null);
    
    this.cfdiService.deleteCFDI(ID)  // ⭐ Ya no necesita .toString()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          Sweetalert.fnc('close', '', null);
          this.loadCFDIs();
          
          setTimeout(() => {
            Sweetalert.fnc('success', 'El CFDI se eliminó correctamente', null);
          }, 100);
        },
        error: (error) => {
          console.error('❌ Error al eliminar CFDI:', error);
          Sweetalert.fnc('error', 'Error al eliminar el CFDI: ' + this.getErrorMessage(error), null);
        }
      });
  }
}

  /**
   * Exporta los CFDI a un formato CSV o Excel
   * @param format Formato de exportación ('csv' o 'xlsx')
   */
  exportCFDIs(format: string = 'xlsx') {
    if (this.cfdis.length === 0) {
      Sweetalert.fnc('info', 'No hay datos para exportar', null);
      return;
    }

    try {
      // Crear datos para exportar
      const data = this.cfdis.map(cfdi => ({
        'Serie': cfdi.serie,
        'Folio': cfdi.folio,
        'Fecha': cfdi.fecha,
        'Tipo': cfdi.tipo,
        'Cliente': cfdi.cliente.nombre,
        'RFC': cfdi.cliente.rfc,
        'Subtotal': cfdi.subtotal,
        'Impuestos': cfdi.impuestos,
        'Total': cfdi.total,
        'Estado': cfdi.estado,
        'UUID': cfdi.uuid
      }));

      // Crear el libro y hoja
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CFDI');

      // Ajustar anchos de columna
      const columnsWidths = [
        { wch: 10 },  // Serie
        { wch: 15 },  // Folio
        { wch: 20 },  // Fecha
        { wch: 15 },  // Tipo
        { wch: 30 },  // Cliente
        { wch: 15 },  // RFC
        { wch: 15 },  // Subtotal
        { wch: 15 },  // Impuestos
        { wch: 15 },  // Total
        { wch: 15 },  // Estado
        { wch: 40 }   // UUID
      ];
      worksheet['!cols'] = columnsWidths;

      const fileName = `cfdi_${new Date().toISOString().split('T')[0]}`;

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
   * Maneja los errores HTTP
   */
  private handleError(error: HttpErrorResponse) {
    console.error('Error en CFDIComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar los CFDI';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }
 /**
   * ⭐ Ver detalle del CFDI en PDF - Usar diseño de INVOICE
   */
  async verDetalleCFDI(cfdi: CFDI) {
    console.log('🔍 Ver detalle llamado para CFDI:', cfdi);
    
    Sweetalert.fnc('loading', 'Generando vista previa del CFDI...', null);
    
    // ⭐ USAR DISEÑO DE INVOICE PARA CFDIs
    const settings = await this.designSettingsService.getSettings();
    const estilo = this.designSettingsService.getDesignForDocumentType(
      DocumentType.INVOICE, // ⭐ Usar INVOICE
      settings
    );
    
    console.log('🎨 Estilo de CFDI obtenido (de Invoice):', estilo);
    
    const cfdiId = cfdi.ID;
    
    this.cfdiService.descargarPDF(cfdiId, estilo).subscribe({
      next: (pdfBlob: Blob) => {
        console.log('✅ PDF recibido, tamaño:', pdfBlob.size);
        Sweetalert.fnc('close', '', null);
        
        const fileURL = URL.createObjectURL(pdfBlob);
        window.open(fileURL, '_blank');
        
        setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
      },
      error: (error) => {
        console.error('❌ Error:', error);
        Sweetalert.fnc('error', 'Error al generar vista previa del CFDI', null);
      }
    });
  }

  /**
   * ⭐ Descargar PDF del CFDI - Usar diseño de INVOICE
   */
  async descargarPDFCfdi(cfdi: CFDI) {
    console.log('💾 Descargar PDF llamado para CFDI:', cfdi.ID);
    
    const settings = await this.designSettingsService.getSettings();
    const estilo = this.designSettingsService.getDesignForDocumentType(
      DocumentType.INVOICE, // ⭐ Usar INVOICE
      settings
    );
    
    console.log('🎨 Estilo de CFDI para descarga (de Invoice):', estilo);
    
    this.cfdiService.descargarPDF(cfdi.ID, estilo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfdi_${cfdi.uuid.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        Sweetalert.fnc('success', 'PDF descargado correctamente', null);
      },
      error: (error) => {
        console.error('❌ Error al descargar:', error);
        Sweetalert.fnc('error', 'Error al descargar el PDF', null);
      }
    });
  }

  
  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}, detalles: ${JSON.stringify(error.error)}`;
    }
  }
  
  // Métodos para paginación móvil
  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    const end = (this.mobilePaginator.pageIndex + 1) * this.mobilePaginator.pageSize;
    return Math.min(end, this.dataSource.filteredData.length);
  }

  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }

  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }

  isLastMobilePage(): boolean {
    const maxPageIndex = Math.ceil(this.dataSource.filteredData.length / this.mobilePaginator.pageSize) - 1;
    return this.mobilePaginator.pageIndex >= maxPageIndex;
  }
}
