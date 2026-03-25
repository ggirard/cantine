import { Component, inject, signal, computed } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-catalogue',
  imports: [
    AsyncPipe,
    FormsModule,
    ProductCardComponent,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="catalogue-header">
      <h1>Catalogue</h1>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Rechercher un produit</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Nom, catégorie..." />
        @if (searchQuery()) {
          <button matSuffix mat-icon-button (click)="searchQuery.set('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
    </div>

    @if (allProducts()) {
      @if (filteredProducts().length > 0) {
        <div class="product-grid">
          @for (product of filteredProducts(); track product.id) {
            <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
          }
        </div>
      } @else {
        <p class="no-results">
          <mat-icon>search_off</mat-icon>
          Aucun produit ne correspond à "{{ searchQuery() }}"
        </p>
      }
    } @else {
      <div class="spinner-container">
        <mat-spinner diameter="40" />
      </div>
    }
  `,
  styles: `
    .catalogue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
    }
    .search-field {
      width: 320px;
    }
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
    .no-results {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9e9e9e;
      padding: 48px 0;
    }
  `,
})
export class CatalogueComponent {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private snackBar = inject(MatSnackBar);

  searchQuery = signal('');

  allProducts = toSignal(this.productService.getAvailableProducts());

  filteredProducts = computed(() => {
    const products = this.allProducts() ?? [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  });

  onAddToCart(product: Product): void {
    this.cartService.addItem(product);
    this.snackBar.open('Produit ajouté au panier', 'OK', { duration: 3000 });
  }
}
