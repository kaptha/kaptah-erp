import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarStateSubject = new BehaviorSubject<boolean>(true);
  sidebarState$ = this.sidebarStateSubject.asObservable();

  toggleSidebar() {
    this.sidebarStateSubject.next(!this.sidebarStateSubject.value);
  }
}