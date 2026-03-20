import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-euros.pipe';
import { ProductFormDialogComponent, ProductFormDialogData } from './product-form-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-product-list',
  imports: [AsyncPipe, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, CentsToDollarsPipe],
  template: `
    <div class="header">
      <h1>Gestion des produits</h1>
      <button mat-fab extended color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        Ajouter
      </button>
    </div>

    @if (products$ | async; as products) {
      <div class="table-container">
        <table mat-table [dataSource]="products">
          <ng-container matColumnDef="image">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              @if (p.imageUrl) {
                <img [src]="p.imageUrl" class="thumb" [alt]="p.name" />
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let p">{{ p.name }}</td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Catégorie</th>
            <td mat-cell *matCellDef="let p">{{ p.category }}</td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Prix</th>
            <td mat-cell *matCellDef="let p">{{ p.price | centsToDollars }}</td>
          </ng-container>

          <ng-container matColumnDef="available">
            <th mat-header-cell *matHeaderCellDef>Disponible</th>
            <td mat-cell *matCellDef="let p">
              <mat-chip-set>
                <mat-chip [class]="p.available ? 'available' : 'unavailable'">
                  {{ p.available ? 'Oui' : 'Non' }}
                </mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button (click)="openEditDialog(p)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="confirmDelete(p)">
                <mat-icon>delete</mat-icon>
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
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
    }
    .thumb {
      width: 48px;
      height: 48px;
      border-radius: 4px;
      object-fit: cover;
    }
    .available {
      --mat-chip-label-text-color: #388e3c;
    }
    .unavailable {
      --mat-chip-label-text-color: #d32f2f;
    }
  `,
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['image', 'name', 'category', 'price', 'available', 'actions'];
  products$ = this.productService.getProducts();

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      data: { mode: 'create' } as ProductFormDialogData,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.productService.createProduct(result);
        this.snackBar.open('Produit ajouté.', 'OK', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Erreur lors de l\'ajout.', 'OK', { duration: 3000 });
      }
    });
  }

  openEditDialog(product: Product): void {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      data: { product, mode: 'edit' } as ProductFormDialogData,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.productService.updateProduct(product.id!, result);
        this.snackBar.open('Produit modifié.', 'OK', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Erreur lors de la modification.', 'OK', { duration: 3000 });
      }
    });
  }

  async confirmDelete(product: Product): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer le produit',
        message: `Supprimer "${product.name}" ?`,
        confirmText: 'Supprimer',
      } as ConfirmDialogData,
    });

    const confirmed = await dialogRef.afterClosed().toPromise();
    if (!confirmed) return;

    try {
      await this.productService.deleteProduct(product.id!);
      this.snackBar.open('Produit supprimé.', 'OK', { duration: 3000 });
    } catch (error) {
      console.error(error);
      this.snackBar.open('Erreur lors de la suppression.', 'OK', { duration: 3000 });
    }
  }
}
