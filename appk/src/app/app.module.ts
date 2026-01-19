import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TokenInterceptor } from './core/interceptors/token.interceptor';

import { AppRoutingModule } from './app-routing.module';
import { PagesModule } from './pages/pages.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { Error404Component } from './error404/error404.component';

import { AuthService } from './services/auth.service';
import { DocumentPreviewComponent } from './shared/components/document-preview/document-preview.component';

@NgModule({ declarations: [
        AppComponent,
        Error404Component,
        DocumentPreviewComponent
    ],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA] // Para prevenir errores con componentes desconocidos
    , imports: [BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        SharedModule, // Añadido para asegurar que los componentes compartidos estén disponibles
        AuthModule,
        PagesModule], providers: [
        AuthService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TokenInterceptor,
            multi: true
        },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }
