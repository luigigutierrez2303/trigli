import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from './supabase';

export const authGuard: CanActivateFn = async () => {
  const sb = inject(Supabase);
  await sb.ready;
  return sb.session() ? true : inject(Router).parseUrl('/login');
};
