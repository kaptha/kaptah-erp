import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appHasPermission]'
})
export class HasPermissionDirective implements OnInit {
  @Input('appHasPermission') permission: string = '';

  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    const hasPermission = this.checkPermission();

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermission(): boolean {
    try {
      const permisos = JSON.parse(localStorage.getItem('userPermissions') || '{}');
      const parts = this.permission.split('.');
      if (parts.length !== 2) return false;

      const modulo = parts[0];
      const accion = parts[1];

      return permisos[modulo]?.[accion] === true;
    } catch {
      return false;
    }
  }
}
