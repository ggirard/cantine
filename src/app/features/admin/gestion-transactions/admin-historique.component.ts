import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, combineLatest, map } from 'rxjs';
import { TransactionService } from '../../../core/services/transaction.service';
import { UserService } from '../../../core/services/user.service';
import { Transaction, AppUser } from '../../../core/models';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-euros.pipe';

interface TransactionRow {
  date: Date;
  email: string;
  type: string;
  description: string;
  amount: number;
  balanceAfter: number;
  rawType: string;
}

@Component({
  selector: 'app-admin-historique',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgClass,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    CentsToDollarsPipe,
  ],
  template: `
    <h2>Historique des transactions</h2>

    @if (rows$ | async; as rows) {
      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="rows" class="full-width">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let row">{{ row.date | date:'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
              <td mat-cell *matCellDef="let row">{{ row.email }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let row">{{ row.type }}</td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let row">{{ row.description }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Montant</th>
              <td mat-cell *matCellDef="let row" [ngClass]="row.rawType === 'credit' ? 'text-green' : 'text-red'">
                {{ row.amount | centsToDollars }}
              </td>
            </ng-container>

            <ng-container matColumnDef="balanceAfter">
              <th mat-header-cell *matHeaderCellDef>Solde après</th>
              <td mat-cell *matCellDef="let row">{{ row.balanceAfter | centsToDollars }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="spinner-wrapper">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }
  `,
  styles: `
    .full-width {
      width: 100%;
    }
    .text-green {
      color: #2e7d32;
      font-weight: 500;
    }
    .text-red {
      color: #c62828;
      font-weight: 500;
    }
    .spinner-wrapper {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `,
})
export class AdminHistoriqueComponent {
  private transactionService = inject(TransactionService);
  private userService = inject(UserService);

  displayedColumns = ['date', 'email', 'type', 'description', 'amount', 'balanceAfter'];

  private static typeLabels: Record<string, string> = {
    achat: 'Achat',
    credit: 'Crédit',
    debit_manuel: 'Débit manuel',
  };

  rows$: Observable<TransactionRow[]> = combineLatest([
    this.transactionService.getAllTransactions(),
    this.userService.getUsers(),
  ]).pipe(
    map(([transactions, users]) => {
      const userMap = new Map<string, AppUser>();
      for (const u of users) {
        userMap.set(u.uid, u);
      }
      return transactions.map((txn) => this.toRow(txn, userMap));
    })
  );

  private toRow(txn: Transaction, userMap: Map<string, AppUser>): TransactionRow {
    const user = userMap.get(txn.userId);
    const date = (txn.createdAt as any)?.toDate
      ? (txn.createdAt as any).toDate()
      : new Date(txn.createdAt);
    return {
      date,
      email: user?.email ?? txn.userId,
      type: AdminHistoriqueComponent.typeLabels[txn.type] ?? txn.type,
      description: txn.description,
      amount: txn.amount,
      balanceAfter: txn.balanceAfter,
      rawType: txn.type,
    };
  }
}
