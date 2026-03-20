import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AppUser } from '../../../core/models';

export interface UserFormDialogData {
  user?: AppUser;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? "Ajouter un utilisateur" : "Modifier l'utilisateur" }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email</mat-label>
        <input matInput [(ngModel)]="form.email" type="email" [disabled]="data.mode === 'edit'" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom affiché</mat-label>
        <input matInput [(ngModel)]="form.displayName" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Rôle</mat-label>
        <mat-select [(ngModel)]="form.role">
          <mat-option value="member">Membre</mat-option>
          <mat-option value="admin">Administrateur</mat-option>
        </mat-select>
      </mat-form-field>

      @if (data.mode === 'edit') {
        <mat-slide-toggle [(ngModel)]="form.active">Actif</mat-slide-toggle>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!form.email">
        {{ data.mode === 'create' ? 'Ajouter' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 350px;
    }
  `,
})
export class UserFormDialogComponent {
  data = inject<UserFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<UserFormDialogComponent>);

  form = {
    email: this.data.user?.email || '',
    displayName: this.data.user?.displayName || '',
    role: this.data.user?.role || 'member' as 'admin' | 'member',
    active: this.data.user?.active ?? true,
  };

  save(): void {
    this.dialogRef.close(this.form);
  }
}
