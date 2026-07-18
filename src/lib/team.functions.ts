import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "support_manager", "delivery_support"] as const;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export interface TeamMember {
  user_id: string;
  email: string;
  roles: string[];
}
export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

/** Map of userId -> email using the Auth Admin API (paginated). */
async function emailMap(admin: any, ids: string[]): Promise<Record<string, string>> {
  const wanted = new Set(ids);
  const out: Record<string, string> = {};
  let page = 1;
  while (wanted.size > 0 && page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users) {
      if (wanted.has(u.id)) {
        out[u.id] = u.email ?? "(no email)";
        wanted.delete(u.id);
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return out;
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ members: TeamMember[]; invites: PendingInvite[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    const rows = roleRows ?? [];
    const ids = [...new Set(rows.map((r: any) => r.user_id))];
    const emails = await emailMap(supabaseAdmin, ids);

    const byUser: Record<string, TeamMember> = {};
    for (const r of rows as any[]) {
      const m = (byUser[r.user_id] ??= { user_id: r.user_id, email: emails[r.user_id] ?? "(unknown)", roles: [] });
      m.roles.push(r.role);
    }

    const { data: invites } = await supabaseAdmin
      .from("admin_invites")
      .select("id, email, role, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return { members: Object.values(byUser), invites: (invites ?? []) as PendingInvite[] };
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ email: z.string().trim().email().max(200), role: z.enum(ROLES) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ status: "granted" | "invited" }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    // Find an existing user with this email.
    let userId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) { userId = found.id; break; }
      if (list.users.length < 200) break;
      page += 1;
    }

    if (userId) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error("Could not assign role");
      return { status: "granted" };
    }

    // Not signed up yet -> store an invite they claim on first login.
    const { error } = await supabaseAdmin
      .from("admin_invites")
      .upsert(
        { email, role: data.role, status: "pending", invited_by: context.userId },
        { onConflict: "email,role" },
      );
    if (error) throw new Error("Could not create invite");
    return { status: "invited" };
  });

export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Prevent removing your own last admin access by accident.
    if (data.user_id === context.userId && data.role === "admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("You are the only admin — add another admin first.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error("Could not remove role");
    return { ok: true };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_invites").delete().eq("id", data.id);
    if (error) throw new Error("Could not cancel invite");
    return { ok: true };
  });
