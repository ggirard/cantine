import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Cantine - Club Social</mat-card-title>
          <mat-card-subtitle>Connectez-vous pour accéder à la cantine</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (loading) {
            <div class="spinner-container">
              <mat-spinner diameter="40" />
            </div>
          }
          @if (errorMessage) {
            <div class="error-message">
              <mat-icon>warning</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>
          }
        </mat-card-content>
        <mat-card-actions align="end">
          <button
            mat-flat-button
            color="primary"
            (click)="signIn()"
            [disabled]="loading"
          >
            <mat-icon>login</mat-icon>
            Se connecter avec Google
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }
    .login-card {
      max-width: 400px;
      width: 100%;
      margin: 16px;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 16px;
    }
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #fdecea;
      border-radius: 4px;
      color: #d32f2f;
      margin-top: 16px;
    }
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';

  async signIn(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const user = await this.authService.signInWithGoogle();
      if (user) {
        this.router.navigate(['/catalogue']);
      } else {
        this.errorMessage =
          'Compte non activé. Contactez un administrateur pour obtenir l\'accès.';
        await this.authService.logout();
      }
    } catch (error) {
      this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }
}
