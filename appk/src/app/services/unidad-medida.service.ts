import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class UnidadMedidaService {
  private apiUrl = `${environment.satCatalogosUrl}/unidad-medida`;

  constructor(private http: HttpClient) { }

  buscarUnidadMedida(termino: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/buscar?termino=${termino}`);
  }
}
