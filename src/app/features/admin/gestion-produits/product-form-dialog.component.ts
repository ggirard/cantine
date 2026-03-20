import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Product } from '../../../core/models';
import { ProductService } from '../../../core/services/product.service';

export interface ProductFormDialogData {
  product?: Product;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-product-form-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Ajouter un produit' : 'Modifier le produit' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom</mat-label>
        <input matInput [(ngModel)]="form.name" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Prix (en dollars)</mat-label>
        <input matInput [(ngModel)]="priceEuros" type="number" step="0.01" min="0" required />
        <span matTextSuffix>$</span>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Catégorie</mat-label>
        <mat-select [(ngModel)]="form.category">
          <mat-option value="boisson">Boisson</mat-option>
          <mat-option value="nourriture">Nourriture</mat-option>
          <mat-option value="snack">Snack</mat-option>
          <mat-option value="autre">Autre</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="image-upload">
        <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput hidden />
        <button mat-stroked-button (click)="fileInput.click()" [disabled]="uploading">
          {{ form.imageUrl ? "Changer l'image" : "Ajouter une image" }}
        </button>
        @if (uploading) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (form.imageUrl) {
          <img [src]="form.imageUrl" class="preview" alt="Aperçu" />
        }
      </div>

      <mat-slide-toggle [(ngModel)]="form.available">Disponible</mat-slide-toggle>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!form.name || uploading">
        {{ data.mode === 'create' ? 'Ajouter' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 350px;
    }
    .image-upload {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .preview {
      max-width: 200px;
      max-height: 150px;
      border-radius: 4px;
      object-fit: cover;
    }
  `,
})
export class ProductFormDialogComponent {
  data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ProductFormDialogComponent>);
  private productService = inject(ProductService);

  uploading = false;
  priceEuros = (this.data.product?.price || 0) / 100;

  form = {
    name: this.data.product?.name || '',
    imageUrl: this.data.product?.imageUrl || '',
    available: this.data.product?.available ?? true,
    category: this.data.product?.category || 'boisson',
  };

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploading = true;
    try {
      this.form.imageUrl = await this.productService.imageToBase64(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      this.uploading = false;
    }
  }

  save(): void {
    this.dialogRef.close({
      ...this.form,
      price: Math.round(this.priceEuros * 100),
    });
  }
}
