import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AppUser } from '../../../core/models';

export interface BalanceAdjustDialogData {
  user: AppUser;
}

export interface BalanceAdjustResult {
  type: 'credit' | 'debit_manuel';
  amount: number; // en centimes
  description: string;
}

@Component({
  selector: 'app-balance-adjust-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Ajuster le solde de {{ data.user.displayName || data.user.email }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="form.type">
          <mat-option value="credit">Crédit (ajouter)</mat-option>
          <mat-option value="debit_manuel">Débit manuel (retirer)</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Montant (en dollars)</mat-label>
        <input matInput [(ngModel)]="amountEuros" type="number" step="0.01" min="0.01" required />
        <span matTextSuffix>$</span>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <input matInput [(ngModel)]="form.description" required />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        (click)="save()"
        [disabled]="!amountEuros || amountEuros <= 0 || !form.description"
      >
        Appliquer
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
export class BalanceAdjustDialogComponent {
  data = inject<BalanceAdjustDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BalanceAdjustDialogComponent>);

  amountEuros = 0;
  form = {
    type: 'credit' as 'credit' | 'debit_manuel',
    description: '',
  };

  save(): void {
    const result: BalanceAdjustResult = {
      type: this.form.type,
      amount: Math.round(this.amountEuros * 100),
      description: this.form.description,
    };
    this.dialogRef.close(result);
  }
}
