import { Component, HostListener, OnInit } from '@angular/core';
import { SidebarService } from '../shared/services/sidebar.service';

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css'],
    standalone: false
})
export class PagesComponent implements OnInit {
  isOpen: boolean = true;
  isMobile: boolean = false;

  constructor(private sidebarService: SidebarService) {
    this.sidebarService.sidebarState$.subscribe(state => {
      this.isOpen = state;
    });
  }

  ngOnInit() {
    this.checkScreenSize();
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
}