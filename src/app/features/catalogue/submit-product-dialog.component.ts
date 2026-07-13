import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-submit-product-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Proposer un article</h2>
    <mat-dialog-content>
      <p class="subtitle">
        Votre proposition sera examinée par un administrateur qui lui assignera un prix avant de la rendre disponible.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom de l'article</mat-label>
        <input matInput [(ngModel)]="form.name" required />
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

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Note (optionnel)</mat-label>
        <textarea matInput [(ngModel)]="form.submissionNote" rows="2" placeholder="Pourquoi proposez-vous cet article ?"></textarea>
      </mat-form-field>

      <div class="image-upload">
        <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput hidden />
        <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="uploading"
          [class.image-missing]="imageTouched && !form.imageUrl">
          <mat-icon>{{ form.imageUrl ? 'photo_camera' : 'add_photo_alternate' }}</mat-icon>
          {{ form.imageUrl ? "Changer l'image" : "Ajouter une image *" }}
        </button>
        @if (uploading) {
          <mat-progress-bar mode="indeterminate" style="width:120px" />
        }
        @if (imageTouched && !form.imageUrl) {
          <span class="image-error">Requis</span>
        }
        @if (form.imageUrl) {
          <img [src]="form.imageUrl" class="preview" alt="Aperçu" />
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="saving">
        Soumettre
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width { width: 100%; }
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 400px;
      padding-top: 8px !important;
      overflow: visible;
    }
    .subtitle {
      color: #757575;
      font-size: 13px;
      margin: 0 0 4px;
      line-height: 1.4;
    }
    mat-form-field {
      margin-bottom: -4px;
    }
    .image-upload {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
    }
    .image-missing {
      border-color: #f44336 !important;
      color: #f44336;
    }
    .image-error {
      font-size: 12px;
      color: #f44336;
    }
    .preview {
      width: 56px;
      height: 56px;
      border-radius: 4px;
      object-fit: cover;
    }
  `,
})
export class SubmitProductDialogComponent {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private dialogRef = inject(MatDialogRef<SubmitProductDialogComponent>);
  private snackBar = inject(MatSnackBar);

  uploading = false;
  saving = false;
  imageTouched = false;

  form = {
    name: '',
    category: 'autre',
    submissionNote: '',
    imageUrl: '',
  };

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageTouched = true;
    if (!file) return;
    this.uploading = true;
    try {
      this.form.imageUrl = await this.productService.processImage(file);
    } catch (error) {
      this.form.imageUrl = '';
      this.snackBar.open(
        error instanceof Error ? error.message : 'Erreur lors du traitement de l\'image.',
        'OK',
        { duration: 4000 },
      );
    } finally {
      this.uploading = false;
      input.value = ''; // permet de re-sélectionner le même fichier
    }
  }

  async submit(): Promise<void> {
    this.imageTouched = true;
    if (!this.form.name || !this.form.imageUrl) return;

    const user = await this.authService.getCurrentUser();
    if (!user) return;

    this.saving = true;
    try {
      await this.productService.submitProduct(
        this.form.name,
        this.form.category,
        this.form.imageUrl,
        this.form.submissionNote,
        user.uid,
        user.displayName,
      );
      this.snackBar.open('Votre proposition a été soumise !', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error(error);
      this.snackBar.open('Erreur lors de la soumission.', 'OK', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }
}
