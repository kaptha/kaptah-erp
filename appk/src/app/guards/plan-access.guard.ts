import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PlanService } from '../services/plan.service';

@Injectable({ providedIn: 'root' })
export class PlanAccessGuard implements CanActivate {
  constructor(
    private planService: PlanService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredModule = route.data['module'] as string;
    if (!requiredModule) return true;

    if (!this.planService.hasAccess(requiredModule)) {
      console.warn('Acceso denegado por plan. Modulo:', requiredModule, 'Plan:', this.planService.getPlan());
      this.router.navigate(['/dashboard'], {
        queryParams: { upgrade: requiredModule }
      });
      return false;
    }

    return true;
  }
}
