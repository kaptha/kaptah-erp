import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material.module';

// Importa componentes específicos
import { NotesComponent } from './notes.component';
import { NoteFormModalComponent } from './note-form-modal/note-form-modal.component';
import { SendEmailDialogComponent } from './send-email-dialog/send-email-dialog.component';

const routes = [
  {
    path: '',
    component: NotesComponent
  }
];

@NgModule({
  declarations: [
    NotesComponent,
    NoteFormModalComponent,
    SendEmailDialogComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
  ],
  exports: [
    NotesComponent,
    NoteFormModalComponent
  ]
  // ❌ QUITAR schemas
})
export class NotesModule { }