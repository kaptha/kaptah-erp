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
  finanzasPanelExpanded = false;
  ventasPanelExpanded = false;
  currentUrl: string = '';
  logoUrl: string | null = null;

  // Permisos del usuario
  private userPermissions: Record<string, any> | null = null;

  constructor(
    private router: Router,
    private logoService: LogoService,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects;
      this.updateExpandedPanels();
    });
  }

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    this.updateExpandedPanels();
    this.loadLogoData();
    this.loadPermissions();
  }

  /**
   * Carga los permisos del usuario desde localStorage
   */
  loadPermissions(): void {
    const permisos = localStorage.getItem('userPermissions');
    if (permisos) {
      try {
        this.userPermissions = JSON.parse(permisos);
        console.log('Permisos cargados en sidebar:', this.userPermissions);
      } catch (e) {
        console.error('Error al parsear permisos:', e);
        this.userPermissions = null;
      }
    }
  }

  /**
   * Verifica si el usuario tiene acceso de lectura a un modulo
   */
  hasAccess(module: string): boolean {
    // Si no hay permisos cargados, mostrar todo (admin por defecto o permisos no cargados aun)
    if (!this.userPermissions) return true;
    return this.userPermissions[module]?.leer === true;
  }

  /**
   * Verifica si el usuario tiene acceso a al menos un modulo de un grupo
   */
  hasGroupAccess(modules: string[]): boolean {
    if (!this.userPermissions) return true;
    return modules.some(m => this.userPermissions![m]?.leer === true);
  }

  updateExpandedPanels(): void {
    this.finanzasPanelExpanded = this.currentUrl.includes('/cobros') || this.currentUrl.includes('/pagos');
    this.ventasPanelExpanded = this.currentUrl.includes('/ventas');
  }

  isActive(route: string): boolean {
    return this.currentUrl.includes(route);
  }

  loadLogoData(): void {
    console.log('=== Cargando logo en sidebar ===');
    this.logoService.getLogo().subscribe({
      next: (data: LogoResponse) => {
        console.log('Logo recibido en sidebar:', data);
        if (data && data.url) {
          this.logoUrl = data.url;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        if (error.status === 404) {
          console.log('Usuario no tiene logo personalizado');
        } else {
          console.error('Error al cargar logo en sidebar:', error);
        }
      }
    });
  }

  onImageError(event: any): void {
    console.error('Error al cargar imagen en sidebar:', event);
    this.logoUrl = null;
    this.cdr.detectChanges();
  }
}
