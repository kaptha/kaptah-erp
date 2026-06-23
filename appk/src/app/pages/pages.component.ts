import { Component, HostListener, OnInit } from '@angular/core';
import { SidebarService } from '../shared/services/sidebar.service';
import { UsersService } from '../services/users.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css'],
    standalone: false
})
export class PagesComponent implements OnInit {
  isOpen: boolean = true;
  isMobile: boolean = false;
  perfilIncompleto: boolean = false;

  constructor(
    private sidebarService: SidebarService,
    private usersService: UsersService,
    private router: Router
  ) {
    this.sidebarService.sidebarState$.subscribe(state => {
      this.isOpen = state;
    });
  }

  ngOnInit() {
    this.checkScreenSize();
    this.checkPerfilIncompleto();
  }

  @HostListener('window:resize')
  checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // Al cambiar a móvil, cerrar sidebar
    if (this.isMobile && !wasMobile) {
      this.sidebarService.setSidebar(false);
    }

    // Al cambiar a desktop, abrir sidebar
    if (!this.isMobile && wasMobile) {
      this.sidebarService.setSidebar(true);
    }
  }

  /**
   * Detecta si el usuario quedo con datos placeholder (reparacion automatica de huerfanos)
   * y necesita completar su perfil (RFC, telefono, etc.)
   */
  private checkPerfilIncompleto(): void {
    const firebaseUid = localStorage.getItem('activeCuentaUid');
    if (!firebaseUid) return;

    this.usersService.getUserFromMySQL(firebaseUid).subscribe(
      (user: any) => {
        const rfcPlaceholder = !user?.rfc || user.rfc === 'XAXX010101000';
        const telefonoPlaceholder = !user?.telefono;
        this.perfilIncompleto = rfcPlaceholder || telefonoPlaceholder;
      },
      (error: any) => console.error('No se pudo verificar estado del perfil:', error)
    );
  }

  irACompletarPerfil(): void {
    this.router.navigate(['/dashboard/perfil']);
  }
}