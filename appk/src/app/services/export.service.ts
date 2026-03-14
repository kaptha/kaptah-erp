import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportToCSV(data: any[], columns: ExportColumn[], fileName: string): void {
    const rows = this.buildRows(data, columns);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, fileName + '.csv', { bookType: 'csv' });
  }

  exportToExcel(data: any[], columns: ExportColumn[], fileName: string): void {
    const rows = this.buildRows(data, columns);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const colWidths = columns.map(col => ({ wch: Math.max(col.header.length + 2, 15) }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, fileName + '.xlsx');
  }

  private buildRows(data: any[], columns: ExportColumn[]): any[][] {
    const header = columns.map(c => c.header);
    const body = data.map(item =>
      columns.map(col => {
        const value = this.getNestedValue(item, col.field);
        return col.transform ? col.transform(value, item) : (value ?? '');
      })
    );
    return [header, ...body];
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => o?.[key], obj);
  }
}

export interface ExportColumn {
  header: string;
  field: string;
  transform?: (value: any, row: any) => any;
}
