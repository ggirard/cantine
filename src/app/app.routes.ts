import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'catalogue', pathMatch: 'full' },
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./features/catalogue/catalogue.component').then(
            (m) => m.CatalogueComponent
          ),
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('./features/historique/historique.component').then(
            (m) => m.HistoriqueComponent
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: '', redirectTo: 'utilisateurs', pathMatch: 'full' },
          {
            path: 'utilisateurs',
            loadComponent: () =>
              import(
                './features/admin/gestion-utilisateurs/user-list.component'
              ).then((m) => m.UserListComponent),
          },
          {
            path: 'produits',
            loadComponent: () =>
              import(
                './features/admin/gestion-produits/product-list.component'
              ).then((m) => m.ProductListComponent),
          },
          {
            path: 'soldes',
            loadComponent: () =>
              import(
                './features/admin/gestion-soldes/balance-list.component'
              ).then((m) => m.BalanceListComponent),
          },
          {
            path: 'transactions',
            loadComponent: () =>
              import(
                './features/admin/gestion-transactions/admin-historique.component'
              ).then((m) => m.AdminHistoriqueComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
