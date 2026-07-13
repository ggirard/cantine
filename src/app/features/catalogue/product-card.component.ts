import { Component, input, output, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../core/models';
import { CentsToDollarsPipe } from '../../shared/pipes/cents-to-euros.pipe';

@Component({
  selector: 'app-product-card',
  imports: [MatCardModule, MatButtonModule, MatIconModule, CentsToDollarsPipe],
  template: `
    <mat-card class="product-card" [class.just-added]="justAdded()">
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
        @if (quantity() > 0) {
          <div class="quantity-stepper">
            <button mat-icon-button (click)="onDecrement()">
              <mat-icon>remove</mat-icon>
            </button>
            <span class="qty-display">{{ quantity() }}</span>
            <button mat-icon-button color="primary" (click)="onIncrement()">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        } @else {
          <button mat-flat-button color="primary" (click)="onAddClick()">
            <mat-icon>add_shopping_cart</mat-icon>
            Ajouter au panier
          </button>
        }
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
    .quantity-stepper {
      display: flex;
      align-items: center;
      border: 2px solid #1976d2;
      border-radius: 24px;
      padding: 0 4px;
      margin: 0 8px;
    }
    .qty-display {
      min-width: 28px;
      text-align: center;
      font-weight: 700;
      font-size: 1.1em;
    }
    @keyframes addFlash {
      0%   { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      25%  { box-shadow: 0 0 0 8px rgba(25, 118, 210, 0.35); transform: scale(1.025); }
      70%  { box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1); transform: scale(1.01); }
      100% { box-shadow: 0 2px 4px rgba(0,0,0,0.1); transform: scale(1); }
    }
    .just-added {
      animation: addFlash 0.55s ease-out;
    }
  `,
})
export class ProductCardComponent {
  product = input.required<Product>();
  quantity = input(0);

  addToCart = output<Product>();
  increment = output<Product>();
  decrement = output<Product>();

  justAdded = signal(false);

  onAddClick(): void {
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 550);
    this.addToCart.emit(this.product());
  }

  onIncrement(): void {
    this.increment.emit(this.product());
  }

  onDecrement(): void {
    this.decrement.emit(this.product());
  }
}
