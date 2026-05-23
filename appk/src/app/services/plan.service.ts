import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UsersService } from './users.service';
import { hasModuleAccess, getModulesForPlan, getPlanLimits, PLAN_NAME_MAP, PlanType } from '../config/plan-access.config';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private planSubject = new BehaviorSubject<string | null>(null);
  public plan$ = this.planSubject.asObservable();

  constructor(private usersService: UsersService) {
    const cachedPlan = localStorage.getItem('activePlan');
    if (cachedPlan) {
      this.planSubject.next(cachedPlan);
    }
  }

  /**
   * Carga el plan del usuario desde Firebase RTDB buscando por firebaseUid
   */
  loadPlanByFirebaseUid(firebaseUid: string): Observable<string | null> {
    return new Observable(observer => {
      const idToken = localStorage.getItem('idToken');

      this.usersService.getFilterData('firebaseUid', firebaseUid, idToken || undefined).subscribe({
        next: (data: any) => {
          if (data) {
            const key = Object.keys(data)[0];
            const plan = data[key]?.plan || null;
            console.log('Plan cargado desde Firebase RTDB:', plan);
            this.setPlan(plan);
            observer.next(plan);
          } else {
            console.warn('No se encontro usuario en RTDB para uid:', firebaseUid);
            observer.next(null);
          }
          observer.complete();
        },
        error: (err) => {
          console.error('Error al cargar plan:', err);
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  setPlan(plan: string | null): void {
    if (plan) {
      localStorage.setItem('activePlan', plan);
    } else {
      localStorage.removeItem('activePlan');
    }
    this.planSubject.next(plan);
  }

  getPlan(): string | null {
    return this.planSubject.value || localStorage.getItem('activePlan');
  }

  getNormalizedPlan(): PlanType | null {
    const plan = this.getPlan();
    if (!plan) return null;
    return PLAN_NAME_MAP[plan] || null;
  }

  hasAccess(module: string): boolean {
    return hasModuleAccess(this.getPlan(), module);
  }

  getAvailableModules(): string[] {
    return getModulesForPlan(this.getPlan());
  }

  getLimits() {
    return getPlanLimits(this.getPlan());
  }

  clearPlan(): void {
    localStorage.removeItem('activePlan');
    this.planSubject.next(null);
  }
}