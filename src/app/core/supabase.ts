import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Supabase {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  readonly session = signal<Session | null>(null);
  /** Resuelve cuando se conoce el estado inicial de la sesión. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  signInWithOtp(email: string) {
    return this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
  }

  signOut() {
    return this.client.auth.signOut();
  }
}
