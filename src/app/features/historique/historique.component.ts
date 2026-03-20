import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, of, switchMap } from 'rxjs';
import { TransactionService } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';
import { Transaction } from '../../core/models';
import { CentsToDollarsPipe } from '../../shared/pipes/cents-to-euros.pipe';

@Component({
  selector: 'app-historique',
  imports: [
    AsyncPipe,
    DatePipe,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    CentsToDollarsPipe,
  ],
  template: `
    <h1>Historique des transactions</h1>
    @if (transactions$ | async; as transactions) {
      @if (transactions.length === 0) {
        <p>Aucune transaction pour le moment.</p>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="transactions">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let t">{{ t.createdAt.toDate ? t.createdAt.toDate() : t.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let t">
                <mat-chip-set>
                  <mat-chip [class]="'type-' + t.type">{{ typeLabel(t.type) }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let t">{{ t.description }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Montant</th>
              <td mat-cell *matCellDef="let t" [class.debit]="t.type !== 'credit'" [class.credit]="t.type === 'credit'">
                {{ t.type === 'credit' ? '+' : '-' }}{{ t.amount | centsToDollars }}
              </td>
            </ng-container>

            <ng-container matColumnDef="balanceAfter">
              <th mat-header-cell *matHeaderCellDef>Solde après</th>
              <td mat-cell *matCellDef="let t">{{ t.balanceAfter | centsToDollars }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }
    } @else {
      <div class="spinner-container">
        <mat-spinner diameter="40" />
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
    .debit {
      color: #d32f2f;
    }
    .credit {
      color: #388e3c;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .type-achat {
      --mat-chip-label-text-color: #d32f2f;
    }
    .type-credit {
      --mat-chip-label-text-color: #388e3c;
    }
    .type-debit_manuel {
      --mat-chip-label-text-color: #f57c00;
    }
  `,
})
export class HistoriqueComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);

  displayedColumns = ['date', 'type', 'description', 'amount', 'balanceAfter'];
  transactions$!: Observable<Transaction[]>;

  ngOnInit(): void {
    this.transactions$ = this.authService.currentUser$.pipe(
      switchMap((user) => {
        if (!user) return of([]);
        return this.transactionService.getTransactionsByUser(user.uid);
      })
    );
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      achat: 'Achat',
      credit: 'Crédit',
      debit_manuel: 'Débit manuel',
    };
    return labels[type] || type;
  }
}
