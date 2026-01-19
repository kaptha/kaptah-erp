import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-terms-dialog',
    templateUrl: './terms-dialog.component.html',
    styleUrls: ['./terms-dialog.component.css'],
    standalone: false
})
export class TermsDialogComponent {
  constructor(public dialogRef: MatDialogRef<TermsDialogComponent>) {
    dialogRef.addPanelClass('scrollable-dialog');
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
