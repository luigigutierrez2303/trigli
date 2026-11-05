import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { needsOnboarding } from './onboarding';
import { OnboardingService } from './onboarding.service';

/** Manda a la bienvenida a quien todavía no tiene perfil. Si falla la consulta, no bloquea la app. */
export const onboardingGuard: CanActivateFn = async () => {
  const onboarding = inject(OnboardingService);
  const router = inject(Router);
  if (onboarding.skipped()) return true;
  try {
    return needsOnboarding(await onboarding.hasProfile(), false) ? router.parseUrl('/bienvenida') : true;
  } catch {
    return true;
  }
};
