import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RolesService } from '../../services/roles.service';

@Component({
  selector: 'app-account-selector',
  templateUrl: './account-selector.component.html',
  styleUrls: ['./account-selector.component.css'],
  standalone: false
})
export class AccountSelectorComponent implements OnInit {
  accounts: any[] = [];
  loading = true;
  showSelector = false;
  userName: string = '';

  constructor(
    private rolesService: RolesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const firebaseUid = localStorage.getItem('firebaseUid');
    this.userName = localStorage.getItem('email') || '';

    if (!firebaseUid) {
      this.router.navigate(['/login']);
      return;
    }

    this.rolesService.getUserAccounts(firebaseUid).subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loading = false;

        if (accounts.length <= 1) {
          // 0 o 1 cuenta: redirigir directo sin mostrar selector
          if (accounts.length === 1) {
            this.selectAccount(accounts[0]);
          } else {
            this.selectOwnAccount(firebaseUid);
          }
        } else {
          // Multiples cuentas: mostrar selector
          this.showSelector = true;
        }
      },
      error: (err) => {
        console.error('Error al cargar cuentas:', err);
        this.loading = false;
        // Fallback: usar su propio UID
        this.selectOwnAccount(firebaseUid);
      }
    });
  }

  selectAccount(account: any): void {
    localStorage.setItem('activeCuentaUid', account.cuentaFirebaseUid);
    localStorage.setItem('activeCuentaNombre', account.nombreCuenta);
    localStorage.setItem('activeRol', account.rol);

    // Cargar permisos de esta cuenta
    const firebaseUid = localStorage.getItem('firebaseUid') || '';
    this.rolesService.getUserPermissions(firebaseUid).subscribe({
      next: (permisos) => {
        if (permisos) {
          localStorage.setItem('userPermissions', JSON.stringify(permisos));
        }
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }

  private selectOwnAccount(firebaseUid: string): void {
    localStorage.setItem('activeCuentaUid', firebaseUid);
    localStorage.setItem('activeRol', 'Administrador');

    this.rolesService.getUserPermissions(firebaseUid).subscribe({
      next: (permisos) => {
        if (permisos) {
          localStorage.setItem('userPermissions', JSON.stringify(permisos));
        }
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }
}
