import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { AvisoPrivacidadComponent } from './legal/aviso-privacidad.component';
import { TerminosComponent } from './legal/terminos.component';
import { DevolucionesComponent } from './legal/devoluciones.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'aviso-de-privacidad', component: AvisoPrivacidadComponent },
  { path: 'terminos-y-condiciones', component: TerminosComponent },
  { path: 'politica-de-devoluciones', component: DevolucionesComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
