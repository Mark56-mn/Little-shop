import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStore";
import { uploadProductImage } from "@/lib/upload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Building2, Search, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings } = useStoreSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "users">("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [grantingPayout, setGrantingPayout] = useState<string | null>(null);
  const [revokingPayout, setRevokingPayout] = useState<string | null>(null);
  
  const { data: users } = useQuery({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, email, full_name, referral_commission_balance, can_request_payout");
      
      if (searchQuery.trim()) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const [f, setF] = useState({
    store_name: "PlugMart",
    logo_url: "" as string | null,
    banner_url: "" as string | null,
    whatsapp_number: "" as string | null,
    profit_multiplier: 1.8,
    default_shipping_fee: 0,
    bank_name: "" as string | null,
    bank_account_name: "" as string | null,
    bank_account_number: "" as string | null,
    bank_sort_code: "" as string | null,
    bank_transfer_instructions: "" as string | null,
    points_per_naira: 1,
    referral_commission_percentage: 10,
    points_discount_rate: 1,
  });

  useEffect(() => {
    if (settings) {
      setF({
        store_name: settings.store_name ?? "PlugMart",
        logo_url: settings.logo_url ?? "",
        banner_url: settings.banner_url ?? "",
        whatsapp_number: settings.whatsapp_number ?? "",
        profit_multiplier: settings.profit_multiplier ?? 1.8,
        default_shipping_fee: settings.default_shipping_fee ?? 0,
        bank_name: settings.bank_name ?? "",
        bank_account_name: settings.bank_account_name ?? "",
        bank_account_number: settings.bank_account_number ?? "",
        bank_sort_code: settings.bank_sort_code ?? "",
        bank_transfer_instructions: settings.bank_transfer_instructions ?? "",
        points_per_naira: settings.points_per_naira ?? 1,
        referral_commission_percentage: settings.referral_commission_percentage ?? 10,
        points_discount_rate: settings.points_discount_rate ?? 1,
      });
    }
  }, [settings]);

  async function upload(kind: "logo" | "banner", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadProductImage(file);
      setF((p) => ({ ...p, [`${kind}_url`]: url }));
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function togglePayoutPermission(userId: string, grant: boolean) {
    const action = grant ? "granting" : "revoking";
    if (grant) setGrantingPayout(userId);
    if (!grant) setRevokingPayout(userId);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ can_request_payout: grant })
        .eq("id", userId);
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`${grant ? "Granted" : "Revoked"} payout permission`);
    } catch (e) {
      toast.error(`Failed to ${action} payout permission`);
    } finally {
      setGrantingPayout(null);
      setRevokingPayout(null);
    }
  }

  async function save() {
    setSaving(true);
    const payload = {
      store_name: f.store_name,
      logo_url: f.logo_url || null,
      banner_url: f.banner_url || null,
      whatsapp_number: f.whatsapp_number || null,
      profit_multiplier: Number(f.profit_multiplier),
      default_shipping_fee: Number(f.default_shipping_fee),
      bank_name: f.bank_name || null,
      bank_account_name: f.bank_account_name || null,
      bank_account_number: f.bank_account_number || null,
      bank_sort_code: f.bank_sort_code || null,
      bank_transfer_instructions: f.bank_transfer_instructions || null,
      points_per_naira: Number(f.points_per_naira),
      referral_commission_percentage: Number(f.referral_commission_percentage),
      points_discount_rate: Number(f.points_discount_rate),
    };
    try {
      if (settings?.id) {
        const { error } = await supabase.from("store_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert(payload as any);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["store_settings"] });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Store settings</h1>
      
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === "general"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === "users"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          User Payouts
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === "general" && (
      <div className="space-y-5">
        <Card className="space-y-3 p-4">
          <div className="text-sm font-semibold">Branding</div>
          <div>
            <Label htmlFor="name">Store name</Label>
            <Input id="name" value={f.store_name} onChange={(e) => setF({ ...f, store_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Logo</Label>
              <div className="mt-1 flex items-center gap-2">
                {f.logo_url && <img src={f.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary">
                  {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                  <input type="file" accept="image/*" hidden onChange={(e) => upload("logo", e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div>
              <Label>Banner</Label>
              <div className="mt-1 flex items-center gap-2">
                {f.banner_url && <img src={f.banner_url} alt="" className="h-12 w-20 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary">
                  {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                  <input type="file" accept="image/*" hidden onChange={(e) => upload("banner", e.target.files?.[0])} />
                </label>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="wa">WhatsApp number (with country code)</Label>
            <Input id="wa" placeholder="2348012345678" value={f.whatsapp_number ?? ""} onChange={(e) => setF({ ...f, whatsapp_number: e.target.value })} />
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="text-sm font-semibold">Pricing defaults</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mult">Profit multiplier</Label>
              <Input id="mult" type="number" step="0.1" min={1} value={f.profit_multiplier}
                onChange={(e) => setF({ ...f, profit_multiplier: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="ship">Default shipping (₦)</Label>
              <Input id="ship" type="number" min={0} value={f.default_shipping_fee}
                onChange={(e) => setF({ ...f, default_shipping_fee: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Selling price = (cost + shipping) × multiplier, rounded to ₦100.</p>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="text-sm font-semibold">Points & Referral System</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="points">Points per ₦1 spent</Label>
              <Input id="points" type="number" step="0.1" min="0.1" value={f.points_per_naira}
                onChange={(e) => setF({ ...f, points_per_naira: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="ref-comm">Referral commission (%)</Label>
              <Input id="ref-comm" type="number" step="0.1" min="0" max="100" value={f.referral_commission_percentage}
                onChange={(e) => setF({ ...f, referral_commission_percentage: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="points-rate">Points discount rate</Label>
              <Input id="points-rate" type="number" step="0.1" min="0.1" value={f.points_discount_rate}
                onChange={(e) => setF({ ...f, points_discount_rate: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Points earned = order amount × points per naira. Discount = points × discount rate. Referral commission % earned by referrer on each purchase by referred customer.
          </p>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" /> Bank Transfer Details
          </div>
          <p className="text-xs text-muted-foreground">
            These details are shown to customers at checkout. When a customer pays via bank transfer,
            you (the admin) manually confirm the payment in the Orders page.
          </p>
          <div>
            <Label htmlFor="bank-name">Bank name</Label>
            <Input id="bank-name" placeholder="e.g. Access Bank" value={f.bank_name ?? ""}
              onChange={(e) => setF({ ...f, bank_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="acct-name">Account name</Label>
              <Input id="acct-name" placeholder="e.g. PlugMart Ltd" value={f.bank_account_name ?? ""}
                onChange={(e) => setF({ ...f, bank_account_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="acct-num">Account number</Label>
              <Input id="acct-num" placeholder="0123456789" value={f.bank_account_number ?? ""}
                onChange={(e) => setF({ ...f, bank_account_number: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="sort">Sort code (optional)</Label>
            <Input id="sort" placeholder="e.g. 123456" value={f.bank_sort_code ?? ""}
              onChange={(e) => setF({ ...f, bank_sort_code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="instr">Transfer instructions (shown to customer at checkout)</Label>
            <Textarea id="instr" rows={3}
              placeholder="Transfer the exact amount to the account above, then send your payment receipt to our WhatsApp."
              value={f.bank_transfer_instructions ?? ""}
              onChange={(e) => setF({ ...f, bank_transfer_instructions: e.target.value })} />
          </div>
        </Card>

        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
        </Button>
      </div>
      )}

      {/* User Payouts Tab */}
      {activeTab === "users" && (
      <div className="space-y-4">
        <Card className="space-y-4 p-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!users || users.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {searchQuery ? "No users found" : "No users with commission balance"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Email</th>
                    <th className="text-left py-2 px-3 font-semibold">Name</th>
                    <th className="text-right py-2 px-3 font-semibold">Commission</th>
                    <th className="text-center py-2 px-3 font-semibold">Payout Access</th>
                    <th className="text-center py-2 px-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{user.email}</td>
                      <td className="py-2 px-3">{user.full_name || "-"}</td>
                      <td className="text-right py-2 px-3 font-mono">
                        ₦{Number(user.referral_commission_balance || 0).toLocaleString()}
                      </td>
                      <td className="text-center py-2 px-3">
                        {user.can_request_payout ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                            <Check className="h-3 w-3" /> Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                            <X className="h-3 w-3" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="text-center py-2 px-3">
                        {user.can_request_payout ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={revokingPayout === user.id}
                            onClick={() => togglePayoutPermission(user.id, false)}
                          >
                            {revokingPayout === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Revoke"
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={grantingPayout === user.id}
                            onClick={() => togglePayoutPermission(user.id, true)}
                          >
                            {grantingPayout === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Grant"
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      )}
    </div>
  );
}
