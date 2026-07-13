import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../../core/models';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-proposal-review-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>Examiner la proposition</h2>
    <mat-dialog-content>
      <div class="info-grid">
        <span class="label">Article</span>
        <span class="value">{{ product.name }}</span>
        <span class="label">Catégorie</span>
        <span class="value">{{ product.category }}</span>
        <span class="label">Proposé par</span>
        <span class="value">{{ product.submittedByName }}</span>
        @if (product.submissionNote) {
          <span class="label">Note</span>
          <span class="value note">{{ product.submissionNote }}</span>
        }
      </div>

      @if (imageUrl) {
        <div class="current-image">
          <img [src]="imageUrl" class="preview" alt="Image proposée" />
        </div>
      }

      <mat-divider />

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Prix</mat-label>
        <input matInput [(ngModel)]="priceDollars" type="number" step="0.01" min="0.01" required />
        <span matTextSuffix>$</span>
      </mat-form-field>

      <div class="image-upload">
        <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput hidden />
        <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="uploading">
          {{ imageUrl ? "Changer l'image" : "Ajouter une image" }}
        </button>
        @if (uploading) {
          <mat-progress-bar mode="indeterminate" />
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="approve()" [disabled]="!priceDollars || priceDollars <= 0 || saving">
        Approuver
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 380px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 16px;
      align-items: start;
    }
    .label {
      font-weight: 500;
      color: #757575;
      font-size: 13px;
      white-space: nowrap;
    }
    .value { font-size: 14px; }
    .note { font-style: italic; }
    .current-image {
      display: flex;
      justify-content: center;
    }
    .preview {
      max-width: 240px;
      max-height: 180px;
      border-radius: 6px;
      object-fit: cover;
    }
    .full-width { width: 100%; }
    .image-upload {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    mat-divider { margin: 4px 0; }
  `,
})
export class ProposalReviewDialogComponent {
  product = inject<Product>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ProposalReviewDialogComponent>);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);

  priceDollars: number | null = null;
  imageUrl = this.product.imageUrl;
  uploading = false;
  saving = false;

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    try {
      this.imageUrl = await this.productService.processImage(file);
    } catch (error) {
      this.snackBar.open(
        error instanceof Error ? error.message : 'Erreur lors du traitement de l\'image.',
        'OK',
        { duration: 4000 },
      );
    } finally {
      this.uploading = false;
      input.value = '';
    }
  }

  async approve(): Promise<void> {
    if (!this.priceDollars || this.priceDollars <= 0) return;
    this.saving = true;
    try {
      await this.productService.approveProduct(
        this.product.id!,
        Math.round(this.priceDollars * 100),
        this.imageUrl,
      );
      this.snackBar.open('Article approuvé et disponible !', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error(error);
      this.snackBar.open("Erreur lors de l'approbation.", 'OK', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }
}
