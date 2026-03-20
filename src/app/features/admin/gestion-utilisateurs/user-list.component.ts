import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { AppUser } from '../../../core/models';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-euros.pipe';
import { UserFormDialogComponent, UserFormDialogData } from './user-form-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  imports: [AsyncPipe, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, CentsToDollarsPipe],
  template: `
    <div class="header">
      <h1>Gestion des utilisateurs</h1>
      <button mat-fab extended color="primary" (click)="openCreateDialog()">
        <mat-icon>person_add</mat-icon>
        Ajouter
      </button>
    </div>

    @if (users$ | async; as users) {
      <div class="table-container">
        <table mat-table [dataSource]="users">
          <ng-container matColumnDef="displayName">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let u">{{ u.displayName || '(non connecté)' }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rôle</th>
            <td mat-cell *matCellDef="let u">
              <mat-chip-set>
                <mat-chip [class]="u.role === 'admin' ? 'role-admin' : ''">
                  {{ u.role === 'admin' ? 'Admin' : 'Membre' }}
                </mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef>Solde</th>
            <td mat-cell *matCellDef="let u" [class.negative]="u.balance < 0">
              {{ u.balance | centsToDollars }}
            </td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let u">
              {{ u.active ? 'Actif' : 'Inactif' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let u">
              <button mat-icon-button (click)="openEditDialog(u)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="confirmDelete(u)">
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
    .negative {
      color: #d32f2f;
    }
    .role-admin {
      --mat-chip-label-text-color: #1976d2;
    }
  `,
})
export class UserListComponent {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['displayName', 'email', 'role', 'balance', 'active', 'actions'];
  users$ = this.userService.getUsers();

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      data: { mode: 'create' } as UserFormDialogData,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.userService.createUser(result);
        this.snackBar.open('Utilisateur ajouté.', 'OK', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Erreur lors de l\'ajout.', 'OK', { duration: 3000 });
      }
    });
  }

  openEditDialog(user: AppUser): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      data: { user, mode: 'edit' } as UserFormDialogData,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.userService.updateUser(user.uid, result);
        this.snackBar.open('Utilisateur modifié.', 'OK', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Erreur lors de la modification.', 'OK', { duration: 3000 });
      }
    });
  }

  async confirmDelete(user: AppUser): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer l\'utilisateur',
        message: `Supprimer "${user.displayName || user.email}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
      } as ConfirmDialogData,
    });

    const confirmed = await dialogRef.afterClosed().toPromise();
    if (!confirmed) return;

    try {
      await this.userService.deleteUser(user.uid);
      this.snackBar.open('Utilisateur supprimé.', 'OK', { duration: 3000 });
    } catch (error) {
      console.error(error);
      this.snackBar.open('Erreur lors de la suppression.', 'OK', { duration: 3000 });
    }
  }
}
