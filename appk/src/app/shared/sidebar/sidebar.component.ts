import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LogoService } from '../../services/logo.service';
import { PlanService } from '../../services/plan.service';

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

  private userPermissions: Record<string, any> | null = null;

  constructor(
    private router: Router,
    private logoService: LogoService,
    private cdr: ChangeDetectorRef,
    private planService: PlanService
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

  loadPermissions(): void {
    const permisos = localStorage.getItem('userPermissions');
    if (permisos) {
      try {
        this.userPermissions = JSON.parse(permisos);
      } catch (e) {
        console.error('Error al parsear permisos:', e);
        this.userPermissions = null;
      }
    }
  }

  /**
   * Verifica si el usuario tiene acceso a un modulo
   * Combina validacion de RBAC (permisos) + Plan
   */
  hasAccess(module: string): boolean {
    // 1. Verificar acceso por plan
    if (!this.planService.hasAccess(module)) return false;

    // 2. Verificar acceso por permisos RBAC
    if (!this.userPermissions) return true;
    return this.userPermissions[module]?.leer === true;
  }

  /**
   * Verifica si el usuario tiene acceso a al menos un modulo de un grupo
   */
  hasGroupAccess(modules: string[]): boolean {
    return modules.some(m => this.hasAccess(m));
  }

  updateExpandedPanels(): void {
    this.finanzasPanelExpanded = this.currentUrl.includes('/cobros') || this.currentUrl.includes('/pagos');
    this.ventasPanelExpanded = this.currentUrl.includes('/ventas');
  }

  isActive(route: string): boolean {
    return this.currentUrl.includes(route);
  }

  loadLogoData(): void {
    this.logoService.getLogo().subscribe({
      next: (data: LogoResponse) => {
        if (data && data.url) {
          this.logoUrl = data.url;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        if (error.status !== 404) {
          console.error('Error al cargar logo en sidebar:', error);
        }
      }
    });
  }

  onImageError(event: any): void {
    this.logoUrl = null;
    this.cdr.detectChanges();
  }
}
