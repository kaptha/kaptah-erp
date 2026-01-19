import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductService } from './inventory/product.service';
import { ServiceService } from './inventory/service.service';

/**
 * Servicio para resolver información de productos y servicios en items de cotización
 */
@Injectable({
  providedIn: 'root'
})
export class QuoteItemResolverService {
  
  constructor(
    private productService: ProductService,
    private serviceService: ServiceService
  ) {}
  
  /**
   * Resuelve la información completa de los items de una cotización
   * @param cotizacion La cotización con sus items
   * @returns La cotización con items enriquecidos con datos de productos/servicios
   */
  resolveItemsInfo(cotizacion: any): Observable<any> {
     // Si cotización es null o undefined, devolver un objeto vacío
  if (!cotizacion) {
    console.warn('La cotización es null o undefined');
    return of({});
  }
  
  console.log('Resolviendo items para cotización:', cotizacion);
  
  // Si no hay items o no es un array, normalizar a array vacío
  if (!cotizacion.items) {
    console.warn('Items no existen, inicializando array vacío');
    cotizacion.items = [];
    return of(cotizacion);
  }
  
  if (!Array.isArray(cotizacion.items)) {
    console.warn('Items no es un array, inicializando array vacío');
    cotizacion.items = [];
    return of(cotizacion);
  }
  
  // Si el array está vacío, devolver la cotización tal cual
  if (cotizacion.items.length === 0) {
    console.warn('Array de items vacío');
    return of(cotizacion);
  }
  
  // Si solo tiene un objeto vacío
  if (cotizacion.items.length === 1 && 
      typeof cotizacion.items[0] === 'object' && 
      cotizacion.items[0] !== null &&
      Object.keys(cotizacion.items[0]).length === 0) {
    console.warn('Items contiene solo un objeto vacío');
    cotizacion.items = [];
    return of(cotizacion);
  }
    
    // Agrupar los IDs por tipo (producto o servicio)
    const productIds = new Set<number>();
    const serviceIds = new Set<number>();
    
    cotizacion.items.forEach(item => {
      if (item.producto_id) {
        productIds.add(item.producto_id);
      }
      if (item.servicio_id) {
        serviceIds.add(item.servicio_id);
      }
    });
    
    // Crear observables para obtener productos y servicios
    const observables: Observable<any>[] = [];
    let productsMap = {};
    let servicesMap = {};
    
    // Si hay productos, obtenerlos
    if (productIds.size > 0) {
      // Obtener todos los productos
      observables.push(
        this.productService.getProducts().pipe(
          map(products => {
            // Crear mapa de id -> producto
            productsMap = products.reduce((map, product) => {
              map[product.id] = product;
              return map;
            }, {});
            return productsMap;
          }),
          catchError(error => {
            console.error('Error al obtener productos:', error);
            return of({});
          })
        )
      );
    }
    
    // Si hay servicios, obtenerlos
    if (serviceIds.size > 0) {
      // Obtener todos los servicios
      observables.push(
        this.serviceService.getServices().pipe(
          map(services => {
            // Crear mapa de id -> servicio
            servicesMap = services.reduce((map, service) => {
              map[service.id] = service;
              return map;
            }, {});
            return servicesMap;
          }),
          catchError(error => {
            console.error('Error al obtener servicios:', error);
            return of({});
          })
        )
      );
    }
    
    // Si no hay observables, devolver la cotización tal cual
    if (observables.length === 0) {
      return of(cotizacion);
    }
    
    // Ejecutar todas las consultas en paralelo
    return forkJoin(observables).pipe(
      map(() => {
        // Enriquecer los items con información de productos/servicios
        cotizacion.items = cotizacion.items.map(item => {
          let itemInfo: any = { ...item };
          
          // Si es un producto
          if (item.producto_id && productsMap[item.producto_id]) {
            const product = productsMap[item.producto_id];
            itemInfo.tipo = 'producto';
            itemInfo.nombreItem = product.name || '';
            itemInfo.descripcionItem = product.description || '';
            // Si no tiene descripción, usar la del producto
            if (!itemInfo.descripcion || itemInfo.descripcion.trim() === '') {
              itemInfo.descripcion = product.name;
            }
          }
          
          // Si es un servicio
          if (item.servicio_id && servicesMap[item.servicio_id]) {
            const service = servicesMap[item.servicio_id];
            itemInfo.tipo = 'servicio';
            itemInfo.nombreItem = service.name || '';
            itemInfo.descripcionItem = service.description || '';
            // Si no tiene descripción, usar la del servicio
            if (!itemInfo.descripcion || itemInfo.descripcion.trim() === '') {
              itemInfo.descripcion = service.name;
            }
          }
          
          return itemInfo;
        });
        
        return cotizacion;
      })
    );
  }
}