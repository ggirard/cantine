import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-catalogue',
  imports: [AsyncPipe, ProductCardComponent, MatProgressSpinnerModule],
  template: `
    <h1>Catalogue</h1>
    @if (products$ | async; as products) {
      <div class="product-grid">
        @for (product of products; track product.id) {
          <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
        } @empty {
          <p>Aucun produit disponible.</p>
        }
      </div>
    } @else {
      <div class="spinner-container">
        <mat-spinner diameter="40" />
      </div>
    }
  `,
  styles: `
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `,
})
export class CatalogueComponent {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private snackBar = inject(MatSnackBar);

  products$ = this.productService.getAvailableProducts();

  onAddToCart(product: Product): void {
    this.cartService.addItem(product);
    this.snackBar.open('Produit ajout\u00e9 au panier', 'OK', { duration: 3000 });
  }
}
