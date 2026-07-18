import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderById, setOrderSenderName, normalizeSenderName } from "@/lib/orders.functions";
import { getSettings } from "@/lib/shop.functions";
import { formatNaira } from "@/lib/format";
import { Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/checkout/$orderId")({
  head: () => ({
    meta: [
      { title: "Checkout — TrendRush NG" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["order", params.orderId],
        queryFn: () => getOrderById({ data: { id: params.orderId } }),
      }),
      context.queryClient.ensureQueryData({ queryKey: ["settings"], queryFn: () => getSettings() }),
    ]);
  },
  component: Checkout,
});

function Checkout() {
  const { orderId } = Route.useParams();
  const router = useRouter();
  const saveSender = useServerFn(setOrderSenderName);
  const { data: order } = useSuspenseQuery(
    queryOptions({
      queryKey: ["order", orderId],
      queryFn: () => getOrderById({ data: { id: orderId } }),
    }),
  );
  const { data: settings } = useSuspenseQuery(
    queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() }),
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [senderName, setSenderName] = useState(order?.sender_name ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Link to="/" className="text-neon underline">
          Back home
        </Link>
      </div>
    );
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const hasSender = !!order.sender_name?.trim();

  const normalized = normalizeSenderName(senderName);
  const nameValid = normalized.length >= 3 && normalized.split(" ").length >= 2;

  async function handleSave() {
    setErr(null);
    if (!nameValid) {
      setErr("Enter your full name (first and last) exactly as on your bank account.");
      return;
    }
    if (!confirmed) {
      setErr("Please confirm you will send the EXACT amount shown.");
      return;
    }
    setSaving(true);
    try {
      await saveSender({ data: { id: orderId, senderName: normalized } });
      await router.invalidate();
    } catch (e: any) {
      setErr(e?.message ?? "Could not save sender name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="text-xs uppercase text-muted-foreground">Order</div>
        <div className="font-mono text-xs">{order.id}</div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
        <div className="mt-1 flex items-center gap-2">
          {order.status === "paid" ? (
            <span className="rounded-full bg-neon/20 px-3 py-1 text-sm font-bold text-neon">
              ✓ Paid — we'll be in touch
            </span>
          ) : (
            <span className="rounded-full bg-orange/20 px-3 py-1 text-sm font-bold text-orange">
              ⏳ Awaiting transfer
            </span>
          )}
        </div>

        {order.status === "pending" && !hasSender && (
          <div className="mt-5 space-y-4 rounded-lg border border-orange/40 bg-orange/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-orange">Before you transfer</p>
                <p className="text-xs text-muted-foreground">
                  We match your payment using <strong>your bank account name</strong> and the{" "}
                  <strong>exact amount</strong>. If they don't match, your order will not be
                  auto-confirmed.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sender's full name (as on your bank account)
              </label>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Barack Hussein Obama"
                className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This MUST match the name on the bank account you are paying from.
              </p>
              {senderName && (
                <p className="mt-1 text-[11px]">
                  <span className="text-muted-foreground">We'll match: </span>
                  <span className={nameValid ? "font-mono text-neon" : "font-mono text-orange"}>
                    {normalized || "—"}
                  </span>
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--color-neon)]"
              />
              <span className="text-muted-foreground">
                I confirm I will send the <strong className="text-neon">EXACT amount</strong>{" "}
                shown below — not a rounded or different amount.
              </span>
            </label>

            {err && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                {err}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save & show bank details
            </button>
          </div>
        )}

        {order.status === "pending" && hasSender && (
          <>
            <div className="mt-5 rounded-lg border border-orange/40 bg-orange/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                <p className="text-sm font-semibold text-orange">
                  Transfer the EXACT amount from the account of{" "}
                  <span className="text-neon">{order.sender_name}</span> to auto-confirm.
                  Wrong name or wrong amount = manual review.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field
                label="Amount to send"
                value={formatNaira(order.unique_amount)}
                copyValue={String(order.unique_amount)}
                onCopy={copy}
                copied={copied}
                accent
              />
              <Field
                label="Bank"
                value={settings?.bank_name || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
              <Field
                label="Account number"
                value={settings?.account_number || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
              <Field
                label="Account name"
                value={settings?.account_name || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
              <Field
                label="Your sender name"
                value={order.sender_name ?? ""}
                onCopy={copy}
                copied={copied}
              />
            </div>

            <button
              onClick={() => router.invalidate()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon"
            >
              <Loader2 className="h-4 w-4" /> I've paid — check status
            </button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Auto-verified via Moniepoint within seconds of your transfer landing.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  copyValue,
  onCopy,
  copied,
  accent,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy: (l: string, v: string) => void;
  copied: string | null;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-0.5 font-mono text-base ${accent ? "font-black text-neon" : "text-foreground"}`}
        >
          {value}
        </div>
      </div>
      <button
        onClick={() => onCopy(label, copyValue ?? value)}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {copied === label ? <Check className="h-4 w-4 text-neon" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
