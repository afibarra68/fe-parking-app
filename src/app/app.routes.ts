import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'administration',
    loadChildren: () => import('./features/administration/administration-module').then(m => m.AdministrationModule),
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
