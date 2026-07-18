import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listTeam, assignRole, removeRole, cancelInvite } from "@/lib/team.functions";
import { ASSIGNABLE_ROLES, roleLabel, type AssignableRole } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Mail, X, Users } from "lucide-react";

export const Route = createFileRoute("/admin/team")({
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const load = useServerFn(listTeam);
  const assign = useServerFn(assignRole);
  const remove = useServerFn(removeRole);
  const cancel = useServerFn(cancelInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("support_manager");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => load(),
  });

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await assign({ data: { email: email.trim(), role } });
      toast.success(res.status === "granted" ? "Role granted" : "Invite sent — they'll get the role on sign in");
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["admin", "team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function drop(user_id: string, r: string) {
    try {
      await remove({ data: { user_id, role: r as AssignableRole } });
      toast.success("Role removed");
      await qc.invalidateQueries({ queryKey: ["admin", "team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function killInvite(id: string) {
    try {
      await cancel({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["admin", "team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team & roles</h1>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-primary" /> Invite or promote by email
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="name@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
              <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={invite} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If the person already has an account they get the role instantly. Otherwise they'll receive it automatically the first time they sign in with that email.
        </p>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Team members
            </div>
            <div className="space-y-2">
              {(data?.members ?? []).map((m) => (
                <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <span className="text-sm font-medium">{m.email}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="gap-1">
                        {roleLabel(r)}
                        <button onClick={() => drop(m.user_id, r)} className="ml-0.5 rounded hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {(data?.members ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No team members yet.</p>
              )}
            </div>
          </Card>

          {(data?.invites ?? []).length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Pending invites
              </div>
              <div className="space-y-2">
                {data!.invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <span className="text-sm">{i.email}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleLabel(i.role)}</Badge>
                      <button onClick={() => killInvite(i.id)} className="rounded hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
