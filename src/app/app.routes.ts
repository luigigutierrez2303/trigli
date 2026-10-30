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
        path: 'comidas',
        loadComponent: () => import('./features/meals/meal-log.page').then((m) => m.MealLogPage),
      },
      {
        path: 'actividad',
        loadComponent: () => import('./features/activity/activity.page').then((m) => m.ActivityPage),
      },
      { path: '', redirectTo: 'comidas', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
