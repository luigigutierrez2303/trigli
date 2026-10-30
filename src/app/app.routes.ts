import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'resumen',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'comidas',
        loadComponent: () => import('./features/meals/meal-log.page').then((m) => m.MealLogPage),
      },
      {
        path: 'actividad',
        loadComponent: () => import('./features/activity/activity.page').then((m) => m.ActivityPage),
      },
      {
        path: 'fuerza',
        loadComponent: () => import('./features/strength/strength.page').then((m) => m.StrengthPage),
      },
      {
        path: 'laboratorio',
        loadComponent: () => import('./features/labs/labs.page').then((m) => m.LabsPage),
      },
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
