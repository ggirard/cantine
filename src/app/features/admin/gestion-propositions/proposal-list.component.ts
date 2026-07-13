import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProposalReviewDialogComponent } from './proposal-review-dialog.component';

@Component({
  selector: 'app-proposal-list',
  imports: [AsyncPipe, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="header">
      <h1>Propositions d'articles</h1>
    </div>

    @if (proposals$ | async; as proposals) {
      @if (proposals.length === 0) {
        <p class="empty">Aucune proposition en attente.</p>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="proposals">
            <ng-container matColumnDef="image">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                @if (p.imageUrl) {
                  <img [src]="p.imageUrl" class="thumb" [alt]="p.name" />
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Article</th>
              <td mat-cell *matCellDef="let p">{{ p.name }}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Catégorie</th>
              <td mat-cell *matCellDef="let p">{{ p.category }}</td>
            </ng-container>

            <ng-container matColumnDef="submittedBy">
              <th mat-header-cell *matHeaderCellDef>Proposé par</th>
              <td mat-cell *matCellDef="let p">{{ p.submittedByName }}</td>
            </ng-container>

            <ng-container matColumnDef="note">
              <th mat-header-cell *matHeaderCellDef>Note</th>
              <td mat-cell *matCellDef="let p" class="note-cell">{{ p.submissionNote }}</td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let p">{{ p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt | date:'dd MMM yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button color="primary" (click)="openReview(p)" matTooltip="Approuver">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmReject(p)" matTooltip="Refuser">
                  <mat-icon>cancel</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }
    }
  `,
  styles: `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .table-container { overflow-x: auto; }
    table { width: 100%; }
    .thumb {
      width: 48px;
      height: 48px;
      border-radius: 4px;
      object-fit: cover;
    }
    .note-cell {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empty {
      color: #9e9e9e;
      padding: 48px 0;
      text-align: center;
    }
  `,
})
export class ProposalListComponent {
  private productService = inject(ProductService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['image', 'name', 'category', 'submittedBy', 'note', 'date', 'actions'];
  proposals$ = this.productService.getPendingSubmissions();

  openReview(product: Product): void {
    this.dialog.open(ProposalReviewDialogComponent, {
      data: product,
      width: '480px',
    });
  }

  async confirmReject(product: Product): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Refuser la proposition',
        message: `Refuser et supprimer la proposition "${product.name}" ?`,
        confirmText: 'Refuser',
      } as ConfirmDialogData,
    });

    const confirmed = await dialogRef.afterClosed().toPromise();
    if (!confirmed) return;

    try {
      await this.productService.rejectProduct(product.id!);
      this.snackBar.open('Proposition refusée.', 'OK', { duration: 3000 });
    } catch (error) {
      console.error(error);
      this.snackBar.open('Erreur lors du refus.', 'OK', { duration: 3000 });
    }
  }
}
