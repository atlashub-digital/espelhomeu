import { createClient } from "@supabase/supabase-js";
export type ProviderSession = { principalId: string; email: string; accessToken: string; refreshToken: string; expiresAt: number };
export interface IdentityProvider {
  generate(email: string): Promise<string>;
  verify(tokenHash: string): Promise<ProviderSession>;
  refresh(refreshToken: string): Promise<ProviderSession>;
  check(accessToken: string, principalId: string): Promise<boolean>;
  revoke(accessToken: string): Promise<void>;
}
/** Stateless clients per operation: never share a customer's Supabase session. No sending API. */
export function supabaseProvider(url: string, key: string): IdentityProvider {
  const client = () => createClient(url, key, { global: { fetch: (input, init) => fetch(input, { ...init, redirect: "error", signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) }) }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const session = (data: { session: { access_token: string; refresh_token: string; expires_at?: number } | null; user: { id: string; email?: string; email_confirmed_at?: string } | null }): ProviderSession => {
    if (!data.session || !data.user?.email || !data.user.email_confirmed_at || !data.session.expires_at) throw new Error("identity_unavailable");
    return { principalId: data.user.id, email: data.user.email.toLowerCase(), accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at * 1000 };
  };
  return {
    async generate(email) {
      // signInWithOtp sends real mail and uses the Master's shared 8-digit template.
      // generateLink produces a proof without delivery or global configuration changes.
      const { data, error } = await client().auth.admin.generateLink({ type: "magiclink", email });
      if (error || !data.properties?.hashed_token) throw new Error("identity_unavailable");
      return data.properties.hashed_token;
    },
    async verify(token_hash) {
      const { data, error } = await client().auth.verifyOtp({ token_hash, type: "email" });
      if (error) throw new Error("identity_unavailable");
      return session(data);
    },
    async refresh(refresh_token) {
      const { data, error } = await client().auth.refreshSession({ refresh_token });
      if (error) throw new Error("identity_unavailable");
      return session(data);
    },
    async check(token, principalId) {
      const { data, error } = await client().auth.getUser(token);
      return !error && data.user?.id === principalId && !!data.user.email_confirmed_at && !data.user.banned_until;
    },
    async revoke(token) {
      const { error } = await client().auth.admin.signOut(token, "local");
      if (error) throw new Error("identity_unavailable");
    },
  };
}
