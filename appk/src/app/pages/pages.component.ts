import { Component } from '@angular/core';
import { SidebarService } from '../shared/services/sidebar.service';

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css'],
    standalone: false
})
export class PagesComponent {
  isOpen: boolean = true;

  constructor(private sidebarService: SidebarService) {
    this.sidebarService.sidebarState$.subscribe(state => {
      this.isOpen = state;
    });
  }
}
