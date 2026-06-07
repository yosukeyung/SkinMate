// ─── Auth helpers ─────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

export type AuthUser = {
  id?: string;
  username: string;
  email: string;
  joinedAt: string; // ISO string
};

const AUTH_KEY = 'skinmate_auth_user';

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

// Sync Supabase auth state with local cache
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const user = session.user;
    setUser({
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      joinedAt: user.created_at || new Date().toISOString()
    });
  } else if (event === 'SIGNED_OUT') {
    clearUser();
  }
});

// Initialize on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    const user = session.user;
    setUser({
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      joinedAt: user.created_at || new Date().toISOString()
    });
  } else {
    clearUser();
  }
});
