import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type Role = "admin" | "vendedor" | "cliente";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isVendedor: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refetchRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  async function loadRoles(userId: string) {
    // Force fresh fetch — no cache. Supabase client doesn't cache by default,
    // but we also bypass any React Query cache for roles.
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as Role));
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // Always re-fetch roles on any auth event (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION)
        setTimeout(() => loadRoles(s.user.id), 0);
        if (event === "SIGNED_IN") {
          qc.invalidateQueries({ queryKey: ["user_roles"] });
        }
      } else {
        setRoles([]);
      }
      router.invalidate();
      qc.invalidateQueries();
    });

    // Always re-fetch on mount, no cache
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    isVendedor: roles.includes("vendedor") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refetchRoles: async () => {
      if (session?.user) await loadRoles(session.user.id);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
