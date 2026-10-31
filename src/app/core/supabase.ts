import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Supabase {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  readonly session = signal<Session | null>(null);
  /** true al volver del mail de "olvidé mi contraseña": hay que pedir una contraseña nueva. */
  readonly recovery = signal(typeof location !== 'undefined' && /type=recovery/.test(location.hash));
  /** Resuelve cuando se conoce el estado inicial de la sesión. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') this.recovery.set(true);
      this.session.set(session);
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  }

  signInWithGoogle() {
    return this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  }

  resetPassword(email: string) {
    return this.client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
  }

  updatePassword(password: string) {
    return this.client.auth.updateUser({ password });
  }

  signOut() {
    return this.client.auth.signOut();
  }
}
