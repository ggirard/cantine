import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../core/models';
import { CentsToDollarsPipe } from '../../shared/pipes/cents-to-euros.pipe';

@Component({
  selector: 'app-product-card',
  imports: [MatCardModule, MatButtonModule, MatIconModule, CentsToDollarsPipe],
  template: `
    <mat-card class="product-card">
      @if (product().imageUrl) {
        <img mat-card-image [src]="product().imageUrl" [alt]="product().name" class="product-image" />
      } @else {
        <div class="placeholder-image">
          <mat-icon>fastfood</mat-icon>
        </div>
      }
      <mat-card-header>
        <mat-card-title>{{ product().name }}</mat-card-title>
        <mat-card-subtitle>{{ product().category }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p class="price">{{ product().price | centsToDollars }}</p>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-flat-button color="primary" (click)="addToCart.emit(product())">
          <mat-icon>add_shopping_cart</mat-icon>
          Ajouter au panier
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .product-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .product-image {
      height: 160px;
      object-fit: contain;
      background: #f5f5f5;
    }
    .placeholder-image {
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e0e0e0;
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #9e9e9e;
      }
    }
    .price {
      font-size: 1.4em;
      font-weight: 500;
      color: #1976d2;
    }
    mat-card-actions {
      margin-top: auto;
    }
  `,
})
export class ProductCardComponent {
  product = input.required<Product>();
  addToCart = output<Product>();
}
