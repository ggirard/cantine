import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { BalanceService } from '../../../core/services/balance.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppUser } from '../../../core/models';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-euros.pipe';
import {
  BalanceAdjustDialogComponent,
  BalanceAdjustDialogData,
  BalanceAdjustResult,
} from './balance-adjust-dialog.component';

@Component({
  selector: 'app-balance-list',
  imports: [AsyncPipe, MatTableModule, MatButtonModule, MatIconModule, CentsToDollarsPipe],
  template: `
    <h1>Gestion des soldes</h1>

    @if (users$ | async; as users) {
      <div class="table-container">
        <table mat-table [dataSource]="users">
          <ng-container matColumnDef="displayName">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let u">{{ u.displayName || '(non connecté)' }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef>Solde</th>
            <td mat-cell *matCellDef="let u" [class.negative]="u.balance < 0">
              {{ u.balance | centsToDollars }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let u">
              <button mat-flat-button color="primary" (click)="openAdjustDialog(u)">
                <mat-icon>account_balance_wallet</mat-icon>
                Ajuster
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    }
  `,
  styles: `
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
    }
    .negative {
      color: #d32f2f;
    }
  `,
})
export class BalanceListComponent {
  private userService = inject(UserService);
  private balanceService = inject(BalanceService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['displayName', 'email', 'balance', 'actions'];
  users$ = this.userService.getUsers();

  openAdjustDialog(user: AppUser): void {
    const dialogRef = this.dialog.open(BalanceAdjustDialogComponent, {
      data: { user } as BalanceAdjustDialogData,
    });

    dialogRef.afterClosed().subscribe(async (result: BalanceAdjustResult | undefined) => {
      if (!result) return;

      try {
        const admin = await this.authService.getCurrentUser();
        if (!admin) return;

        if (result.type === 'credit') {
          await this.balanceService.credit(
            user.uid,
            result.amount,
            result.description,
            admin.uid
          );
        } else {
          await this.balanceService.manualDebit(
            user.uid,
            result.amount,
            result.description,
            admin.uid
          );
        }

        this.snackBar.open('Solde ajusté.', 'OK', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Erreur lors de l\'ajustement.', 'OK', { duration: 3000 });
      }
    });
  }
}
