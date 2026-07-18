import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRole(uid: string | undefined) {
      if (!uid) {
        if (active) setIsAdmin(false);
        return;
      }
      // Claim any pending role invitations addressed to this user's email.
      try {
        await supabase.rpc("claim_my_invites");
      } catch {
        /* non-fatal */
      }
      // Apply a captured referral code (from a ?ref= link), once.
      try {
        const ref =
          typeof window !== "undefined" ? window.localStorage.getItem("plugmart_ref") : null;
        if (ref) {
          const { data: res } = await supabase.rpc("apply_referral", { _code: ref });
          // Clear unless it was a transient/no-op we might retry; treat all defined results as final.
          if (res) window.localStorage.removeItem("plugmart_ref");
        }
      } catch {
        /* non-fatal */
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setIsAdmin(!!data);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadRole(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer supabase call outside the callback
      setTimeout(() => loadRole(s?.user.id), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, isAdmin, loading };
}
