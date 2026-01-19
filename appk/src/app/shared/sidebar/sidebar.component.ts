import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LogoService } from '../../services/logo.service';

interface LogoResponse {
  url: string;
  filename?: string;
  type?: string;
  size?: number;
  message?: string;
}

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false
})
export class SidebarComponent implements OnInit {
  // Para controlar qué paneles están expandidos
  finanzasPanelExpanded = false;
  ventasPanelExpanded = false;
  
  // Ruta actual para resaltar el elemento de menú activo
  currentUrl: string = '';
  
  // Logo del usuario
  logoUrl: string | null = null;
  
  constructor(
    private router: Router,
    private logoService: LogoService,
    private cdr: ChangeDetectorRef
  ) {
    // Escuchar los cambios de ruta para actualizar la ruta actual
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects;
      this.updateExpandedPanels();
    });
  }
  
  ngOnInit(): void {
    // Inicializar la ruta actual
    this.currentUrl = this.router.url;
    this.updateExpandedPanels();
    
    // Cargar logo del usuario
    this.loadLogoData();
  }
  
  /**
   * Actualiza los paneles expandidos según la ruta actual
   */
  updateExpandedPanels(): void {
    // Expandir el panel de finanzas si la ruta actual contiene "cobros" o "pagos"
    this.finanzasPanelExpanded = this.currentUrl.includes('/cobros') || this.currentUrl.includes('/pagos');
    
    // Expandir el panel de ventas si la ruta actual contiene "ventas"
    this.ventasPanelExpanded = this.currentUrl.includes('/ventas');
  }
  
  /**
   * Verifica si una ruta específica está activa
   */
  isActive(route: string): boolean {
    return this.currentUrl.includes(route);
  }
  
  /**
   * Carga los datos del logo actual del usuario
   */
  loadLogoData(): void {
    console.log('=== Cargando logo en sidebar ===');
    this.logoService.getLogo().subscribe({
      next: (data: LogoResponse) => {
        console.log('✅ Logo recibido en sidebar:', data);
        
        if (data && data.url) {
          this.logoUrl = data.url;
          console.log('✅ Logo URL asignada en sidebar:', this.logoUrl);
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ Respuesta sin URL en sidebar:', data);
        }
      },
      error: (error: any) => {
        if (error.status === 404) {
          console.log('ℹ️ Usuario no tiene logo personalizado (404 - normal)');
          // Mantener logo por defecto
        } else {
          console.error('❌ Error al cargar logo en sidebar:', error);
        }
      }
    });
  }
  
  /**
   * Maneja errores al cargar la imagen del logo
   */
  onImageError(event: any): void {
    console.error('Error al cargar imagen en sidebar:', event);
    console.log('URL que falló:', this.logoUrl);
    // Revertir a logo por defecto
    this.logoUrl = null;
    this.cdr.detectChanges();
  }
}