import 'server-only';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);

function clean(value: string | undefined) {
  return (value || '').trim();
}

function getConfig() {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('PREVENTA_ADMIN_AUTH_NOT_CONFIGURED');
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}

function serverClient(key: string) {
  const { supabaseUrl } = getConfig();
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function authenticatedClient(anonKey: string, accessToken: string) {
  const { supabaseUrl } = getConfig();
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type PreventaAdminIdentity = {
  userId: string;
  email: string | null;
  role: string;
};

export async function requirePreventaAdmin(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = (match?.[1] || '').trim();

  if (!token || token.length > 4096) {
    throw new Error('PREVENTA_ADMIN_UNAUTHENTICATED');
  }

  const config = getConfig();
  const authClient = serverClient(config.anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData.user) {
    throw new Error('PREVENTA_ADMIN_UNAUTHENTICATED');
  }

  // Reuse the canonical Academy authorization guard with the caller's verified JWT.
  // This centralizes UUID-only identity, accepted admin roles and progressive AAL2/MFA
  // enforcement instead of maintaining a weaker parallel PREVENTA authorization path.
  const authzClient = authenticatedClient(config.anonKey, token);
  const { data: centralAdminAllowed, error: centralAdminError } = await authzClient.rpc('ghc_is_admin');
  if (centralAdminError) {
    throw new Error('PREVENTA_ADMIN_AUTHORIZATION_CHECK_FAILED');
  }
  if (centralAdminAllowed !== true) {
    throw new Error('PREVENTA_ADMIN_FORBIDDEN');
  }

  const serviceClient = serverClient(config.serviceRoleKey);
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role,email')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`PREVENTA_ADMIN_PROFILE_LOOKUP_FAILED:${profileError.message}`);
  }

  const role = String(profile?.role || '').trim().toLowerCase();
  if (!ADMIN_ROLES.has(role)) {
    throw new Error('PREVENTA_ADMIN_FORBIDDEN');
  }

  const identity: PreventaAdminIdentity = {
    userId: userData.user.id,
    email: String(profile?.email || userData.user.email || '').trim() || null,
    role,
  };

  return { identity, serviceClient };
}

export function preventaAdminAuthHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'PREVENTA_ADMIN_UNAUTHENTICATED') return 401;
  if (message === 'PREVENTA_ADMIN_FORBIDDEN') return 403;
  return 500;
}
