import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CartService, CartItem } from '../../core/services/cart.service';
import { CentsToDollarsPipe } from '../../shared/pipes/cents-to-euros.pipe';

@Component({
  selector: 'app-cart-dialog',
  imports: [
    AsyncPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule,
    CentsToDollarsPipe,
  ],
  template: `
    <h2 mat-dialog-title>Panier</h2>
    <mat-dialog-content>
      @if (cartService.items$ | async; as items) {
        @if (items.length === 0) {
          <p>Le panier est vide.</p>
        } @else {
          <table mat-table [dataSource]="items" class="cart-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Produit</th>
              <td mat-cell *matCellDef="let item">{{ item.product.name }}</td>
            </ng-container>

            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef>Prix unitaire</th>
              <td mat-cell *matCellDef="let item">{{ item.product.price | centsToDollars }}</td>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>Quantit\u00e9</th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button (click)="decrementQuantity(item)" [disabled]="item.quantity <= 1">
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="quantity-value">{{ item.quantity }}</span>
                <button mat-icon-button (click)="incrementQuantity(item)">
                  <mat-icon>add</mat-icon>
                </button>
              </td>
            </ng-container>

            <ng-container matColumnDef="lineTotal">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let item">{{ item.product.price * item.quantity | centsToDollars }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button color="warn" (click)="removeItem(item)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-divider></mat-divider>

          <div class="cart-total">
            <strong>Total : {{ cartService.total$ | async | centsToDollars }}</strong>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onClear()" color="warn">Vider le panier</button>
      <button mat-button mat-dialog-close>Fermer</button>
      <button
        mat-flat-button
        color="primary"
        (click)="onConfirm()"
        [disabled]="(cartService.itemCount$ | async) === 0"
      >
        Confirmer l'achat
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .cart-table {
      width: 100%;
    }
    .quantity-value {
      display: inline-block;
      min-width: 24px;
      text-align: center;
      font-weight: 500;
    }
    .cart-total {
      padding: 16px 0;
      text-align: right;
      font-size: 1.2em;
    }
    mat-dialog-content {
      min-width: 400px;
    }
  `,
})
export class CartDialogComponent {
  cartService = inject(CartService);
  private dialogRef = inject(MatDialogRef<CartDialogComponent>);

  displayedColumns = ['name', 'unitPrice', 'quantity', 'lineTotal', 'actions'];

  incrementQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id!, item.quantity + 1);
  }

  decrementQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id!, item.quantity - 1);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.product.id!);
  }

  onClear(): void {
    this.cartService.clear();
  }

  onConfirm(): void {
    this.dialogRef.close('confirm');
  }
}
