import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RolesService } from '../../services/roles.service';
import { UsersService } from '../../services/users.service';
import { PlanService } from '../../services/plan.service';

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
    private router: Router,
    private usersService: UsersService,
    private planService: PlanService
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
          if (accounts.length === 1) {
            this.selectAccount(accounts[0]);
          } else {
            this.selectOwnAccount(firebaseUid);
          }
        } else {
          this.showSelector = true;
        }
      },
      error: (err) => {
        console.error('Error al cargar cuentas:', err);
        this.loading = false;
        this.selectOwnAccount(firebaseUid);
      }
    });
  }

  selectAccount(account: any): void {
    localStorage.setItem('activeCuentaUid', account.cuentaFirebaseUid);
    localStorage.setItem('activeCuentaNombre', account.nombreCuenta);
    localStorage.setItem('activeRol', account.rol);

    // Guardar RFC de la cuenta activa
    this.usersService.getUserFromMySQL(account.cuentaFirebaseUid).subscribe({
      next: (user: any) => {
        if (user?.rfc) {
          localStorage.setItem('activeCuentaRfc', user.rfc);
        }
      },
      error: () => {
        console.warn('No se pudo obtener RFC de la cuenta activa');
      }
    });

    // Cargar plan de la cuenta (del dueno de la cuenta)
    this.planService.loadPlanByFirebaseUid(account.cuentaFirebaseUid).subscribe({
      next: (plan) => {
        console.log('Plan de la cuenta cargado:', plan);
      },
      error: (err) => {
        console.warn('No se pudo cargar el plan:', err);
      }
    });

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

    // Guardar RFC propio
    this.usersService.getUserFromMySQL(firebaseUid).subscribe({
      next: (user: any) => {
        if (user?.rfc) {
          localStorage.setItem('activeCuentaRfc', user.rfc);
        }
      },
      error: () => {}
    });

    // Cargar plan propio
    this.planService.loadPlanByFirebaseUid(firebaseUid).subscribe({
      next: (plan) => {
        console.log('Plan propio cargado:', plan);
      },
      error: (err) => {
        console.warn('No se pudo cargar el plan:', err);
      }
    });

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
