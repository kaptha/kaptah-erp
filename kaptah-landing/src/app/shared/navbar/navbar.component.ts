import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  
  scrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrolled = window.scrollY > 40;
  }
  menuOpen = false;

toggleMenu() {
  this.menuOpen = !this.menuOpen;
}

closeMenu() {
  this.menuOpen = false;
}

}


