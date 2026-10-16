import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      console.warn('Supabase auth getUser error:', error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (err) {
    console.error('Failed to get session:', err);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Cloud database is not connected. Please configure your Supabase URL & Key.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { user: null, error: msg };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Cloud database is not connected. Please configure your Supabase URL & Key.' };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    const message = data.session
      ? 'Account created successfully! You are now logged in.'
      : 'Account created! Please check your email to confirm your sign-up.';

    return { user: data.user, error: null, message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { user: null, error: msg };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: null };

  try {
    const { error } = await client.auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

export function subscribeToAuthChanges(callback: (user: User | null, session: Session | null) => void) {
  const client = getSupabaseClient();
  if (!client) {
    callback(null, null);
    return () => {};
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}
