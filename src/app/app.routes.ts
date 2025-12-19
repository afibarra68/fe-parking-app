import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/administration/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [redirectIfAuthenticatedGuard],
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'administration',
    canActivate: [authGuard],
    loadChildren: () => import('./features/administration/administration-module').then(m => m.AdministrationModule),
  },
  {
    path: 'configuration',
    canActivate: [authGuard],
    loadChildren: () => import('./features/configuration/configuration-module').then(m => m.ConfigurationModule),
  },
  {
    path: '**',
    redirectTo: '/administration/dashboard'
  }
];
