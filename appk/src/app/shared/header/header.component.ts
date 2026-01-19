import { Component, OnInit } from '@angular/core';

import { SidebarService } from '../services/sidebar.service';
import { UsersService } from 'src/app/services/users.service';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    standalone: false
})
export class HeaderComponent implements OnInit{
  authValidate:boolean = false;
  userName: string = '';

  constructor(
    private sidebarService: SidebarService, 
    private usersService: UsersService,
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    const idToken = localStorage.getItem("idToken");
    console.log('Token obtenido de localStorage:', idToken);
    
    if (idToken) {
      this.usersService.getUserByToken(idToken).subscribe(
        user => {
          console.log('Usuario recibido:', JSON.stringify(user, null, 2));
          if (user) {
            this.userName = user.nombre;
          } else {
            console.log('No se encontró el usuario con el token proporcionado');
          }
        },
        error => console.error('Error al obtener el usuario:', error)
      );
    } else {
      console.log('No se encontró idToken en localStorage');
    }
  }

  /**
   * Obtiene las iniciales del nombre del usuario
   * Ejemplos:
   * - "Mario Diaz Valencia" -> "MDV"
   * - "Juan Pérez" -> "JP"
   * - "Ana" -> "A"
   */
  getUserInitials(): string {
    if (!this.userName) {
      return 'U'; // Default: U de Usuario
    }
    
    const names = this.userName.trim().split(' ').filter(name => name.length > 0);
    
    if (names.length === 0) {
      return 'U';
    }
    
    // Si solo hay un nombre, tomar las primeras 2 letras
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    // Si hay 2 nombres, tomar la primera letra de cada uno
    if (names.length === 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    
    // Si hay 3 o más nombres, tomar la primera letra de los primeros 3
    return (names[0][0] + names[1][0] + names[2][0]).toUpperCase();
  }
  
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  /**
   * Cerrar sesión - Limpia todos los tokens y redirige al login
   */
  logout(): void {
    console.log('🚪 Cerrando sesión desde header...');
    
    // Limpiar TODOS los tokens (Firebase + JWT)
    localStorage.removeItem('idToken');        // Firebase token
    localStorage.removeItem('expiresIn');      // Expiración Firebase
    localStorage.removeItem('access_token');   // JWT access token
    localStorage.removeItem('refresh_token');  // JWT refresh token
    localStorage.removeItem('user');           // Datos del usuario
    
    // También llamar al método logout del AuthService por si tiene lógica adicional
    this.authService.logout();
    
    console.log('✅ Sesión cerrada, redirigiendo a login...');
  }
  
}
