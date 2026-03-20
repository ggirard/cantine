import { Component, inject, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay, firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { BalanceService } from '../core/services/balance.service';
import { CartService } from '../core/services/cart.service';
import { ThemeService } from '../core/services/theme.service';
import { BalanceChipComponent } from '../shared/components/balance-chip/balance-chip.component';
import { CartDialogComponent } from '../features/catalogue/cart-dialog.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AsyncPipe,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    BalanceChipComponent,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #sidenav
        [mode]="(isHandset$ | async) ? 'over' : 'side'"
        [opened]="!(isHandset$ | async)"
        class="sidenav"
      >
        <mat-nav-list>
          <a mat-list-item routerLink="/catalogue" routerLinkActive="active" (click)="closeSidenav()">
            <mat-icon matListItemIcon>restaurant</mat-icon>
            <span matListItemTitle>Catalogue</span>
          </a>
          <a mat-list-item routerLink="/historique" routerLinkActive="active" (click)="closeSidenav()">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>Historique</span>
          </a>
          @if (authService.isAdmin$ | async) {
            <mat-divider></mat-divider>
            <h3 matSubheader>Administration</h3>
            <a mat-list-item routerLink="/admin/utilisateurs" routerLinkActive="active" (click)="closeSidenav()">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>Utilisateurs</span>
            </a>
            <a mat-list-item routerLink="/admin/produits" routerLinkActive="active" (click)="closeSidenav()">
              <mat-icon matListItemIcon>inventory_2</mat-icon>
              <span matListItemTitle>Produits</span>
            </a>
            <a mat-list-item routerLink="/admin/soldes" routerLinkActive="active" (click)="closeSidenav()">
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Soldes</span>
            </a>
            <a mat-list-item routerLink="/admin/transactions" routerLinkActive="active" (click)="closeSidenav()">
              <mat-icon matListItemIcon>history</mat-icon>
              <span matListItemTitle>Transactions</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          @if (isHandset$ | async) {
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span>Cantine</span>
          <span class="spacer"></span>

          @if (authService.currentUser$ | async; as user) {
            <button
              mat-icon-button
              (click)="openCart()"
              [matBadge]="(cartService.itemCount$ | async) || null"
              matBadgeColor="warn"
              matBadgeSize="small"
              [matBadgeHidden]="(cartService.itemCount$ | async) === 0"
            >
              <mat-icon>shopping_cart</mat-icon>
            </button>
            <app-balance-chip [balance]="user.balance" />
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              @if (user.photoURL) {
                <img [src]="user.photoURL" class="avatar" [alt]="user.displayName" referrerpolicy="no-referrer" />
              } @else {
                <mat-icon>account_circle</mat-icon>
              }
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="user-info" mat-menu-item disabled>
                <strong>{{ user.displayName }}</strong><br />
                <small>{{ user.email }}</small>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="themeService.toggle()">
                <mat-icon>{{ (themeService.theme$ | async) === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
                <span>{{ (themeService.theme$ | async) === 'dark' ? 'Mode clair' : 'Mode sombre' }}</span>
              </button>
              <button mat-menu-item (click)="authService.logout()">
                <mat-icon>logout</mat-icon>
                <span>D\u00e9connexion</span>
              </button>
            </mat-menu>
          }
        </mat-toolbar>

        <main class="content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .shell-container {
      height: 100vh;
    }
    .sidenav {
      width: 240px;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }
    .content {
      padding: 24px;
    }
    .active {
      background: rgba(0, 0, 0, 0.04);
    }
    .user-info {
      line-height: 1.4;
      white-space: normal;
    }
    mat-divider {
      margin: 8px 0;
    }
  `,
})
export class ShellComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);
  themeService = inject(ThemeService);
  private balanceService = inject(BalanceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  isHandset$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map((result) => result.matches),
      shareReplay(1)
    );

  async openCart(): Promise<void> {
    const dialogRef = this.dialog.open(CartDialogComponent, {
      width: '600px',
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result !== 'confirm') return;

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) return;

      const items = await firstValueFrom(this.cartService.items$);
      if (items.length === 0) return;

      await this.balanceService.purchaseCart(user.uid, items, user.uid);
      this.cartService.clear();
      this.snackBar.open('Achat confirm\u00e9 avec succ\u00e8s !', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Purchase error:', error);
      this.snackBar.open('Erreur lors de l\'achat.', 'OK', { duration: 3000 });
    }
  }

  closeSidenav(): void {
    this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(map((result) => result.matches))
      .subscribe((isHandset) => {
        if (isHandset) this.sidenav.close();
      })
      .unsubscribe();
  }
}
