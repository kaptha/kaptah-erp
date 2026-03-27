import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Role } from '../../../../services/roles.service';

@Component({
  selector: 'app-sub-user-dialog',
  templateUrl: './sub-user-dialog.component.html',
  styleUrls: ['./sub-user-dialog.component.css'],
  standalone: false
})
export class SubUserDialogComponent implements OnInit {
  form: FormGroup;
  roles: Role[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SubUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roles: Role[] }
  ) {
    this.roles = data.roles || [];
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rolId: [null, Validators.required]
    });
  }

  ngOnInit(): void {}

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
