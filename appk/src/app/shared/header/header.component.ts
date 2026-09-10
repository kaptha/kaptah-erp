import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SidebarService } from '../services/sidebar.service';
import { UsersService } from 'src/app/services/users.service';
import { AuthService } from 'src/app/services/auth.service';
import { RolesService } from 'src/app/services/roles.service';
import { PlanService } from 'src/app/services/plan.service';
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

  // Cambio rapido de cuenta (despachos / sub-usuarios con varias cuentas)
  accounts: any[] = [];
  activeCuentaUid: string | null = null;
  activeCuentaNombre: string = '';
  switchingAccount = false;

  constructor(
    private sidebarService: SidebarService,
    private usersService: UsersService,
    private authService: AuthService,
    private rolesService: RolesService,
    private planService: PlanService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idToken = localStorage.getItem("idToken");

    if (idToken) {
      this.usersService.getUserByToken(idToken).subscribe(
        user => {
          if (user) {
            this.userName = user.nombre;
          }
        },
        error => console.error('Error al obtener el usuario:', error)
      );
    }

    this.loadAccounts();
  }

  private loadAccounts(): void {
    const firebaseUid = localStorage.getItem('firebaseUid');
    if (!firebaseUid) return;

    this.activeCuentaUid = localStorage.getItem('activeCuentaUid');
    this.activeCuentaNombre = localStorage.getItem('activeCuentaNombre') || 'Mi cuenta';

    this.rolesService.getUserAccounts(firebaseUid).subscribe({
      next: (accounts) => {
        this.accounts = accounts || [];
        const actual = this.accounts.find(a => a.cuentaFirebaseUid === this.activeCuentaUid);
        if (actual?.nombreCuenta) {
          this.activeCuentaNombre = actual.nombreCuenta;
        }
      },
      error: () => (this.accounts = [])
    });
  }

  switchAccount(account: any): void {
    if (!account || account.cuentaFirebaseUid === this.activeCuentaUid || this.switchingAccount) return;
    this.switchingAccount = true;

    const firebaseUid = localStorage.getItem('firebaseUid') || '';

    localStorage.setItem('activeCuentaUid', account.cuentaFirebaseUid);
    localStorage.setItem('activeCuentaNombre', account.nombreCuenta || '');
    localStorage.setItem('activeRol', account.rol || '');
    localStorage.removeItem('activeCuentaRfc');
    localStorage.removeItem('userPermissions');

    forkJoin({
      user: this.usersService.getUserFromMySQL(account.cuentaFirebaseUid).pipe(catchError(() => of(null))),
      permisos: this.rolesService.getUserPermissions(firebaseUid).pipe(catchError(() => of(null))),
      plan: this.planService.loadPlanByFirebaseUid(account.cuentaFirebaseUid).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ user, permisos }) => {
        if (user?.rfc) localStorage.setItem('activeCuentaRfc', user.rfc);
        if (permisos) localStorage.setItem('userPermissions', JSON.stringify(permisos));
        window.location.href = '/dashboard';
      },
      error: () => {
        window.location.href = '/dashboard';
      }
    });
  }

  /**
   * Obtiene las iniciales del nombre del usuario
   */
  getUserInitials(): string {
    if (!this.userName) {
      return 'U';
    }

    const names = this.userName.trim().split(' ').filter(name => name.length > 0);

    if (names.length === 0) {
      return 'U';
    }

    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }

    if (names.length === 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }

    return (names[0][0] + names[1][0] + names[2][0]).toUpperCase();
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  /**
   * Cerrar sesion - Limpia todos los tokens y redirige al login
   */
  logout(): void {
    localStorage.removeItem('idToken');
    localStorage.removeItem('expiresIn');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('firebaseUid');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('userRole');
    localStorage.removeItem('activeCuentaUid');
    localStorage.removeItem('activeCuentaNombre');
    localStorage.removeItem('activeCuentaRfc');
    localStorage.removeItem('activeRol');

    this.authService.logout();
  }

}