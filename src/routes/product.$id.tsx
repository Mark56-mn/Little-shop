import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getProduct, getSettings } from "@/lib/shop.functions";
import { askAiAboutProduct } from "@/lib/ai.functions";
import { createOrder } from "@/lib/orders.functions";
import { formatNaira } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, ShoppingBag, Loader2 } from "lucide-react";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Product · TrendRush NG` },
      { name: "description", content: `View product ${params.id} on TrendRush NG.` },
    ],
  }),
  loader: async ({ context, params }) => {
    const opts = queryOptions({
      queryKey: ["product", params.id],
      queryFn: () => getProduct({ data: { id: params.id } }),
    });
    await Promise.all([
      context.queryClient.ensureQueryData(opts),
      context.queryClient.ensureQueryData({ queryKey: ["settings"], queryFn: () => getSettings() }),
    ]);
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();
  const createOrderFn = useServerFn(createOrder);
  const { data: product } = useSuspenseQuery(
    queryOptions({ queryKey: ["product", id], queryFn: () => getProduct({ data: { id } }) }),
  );
  const { data: settings } = useSuspenseQuery(
    queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() }),
  );
  const [active, setActive] = useState(0);
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [askingAi, setAskingAi] = useState(false);
  const askAiFn = useServerFn(askAiAboutProduct);

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link to="/" className="mt-4 inline-block text-neon underline">
          Back home
        </Link>
      </div>
    );
  }

  async function handleBuy(asGuest: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const payload: any = { productId: id, quantity: 1 };
      if (user) {
        payload.userId = user.id;
      } else if (asGuest) {
        if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
          throw new Error("Please fill in name, phone and email.");
        }
        payload.guestName = guestName.trim();
        payload.guestPhone = guestPhone.trim();
        payload.guestEmail = guestEmail.trim();
      }
      const { id: orderId } = await createOrderFn({ data: payload });
      await router.invalidate();
      navigate({ to: "/checkout/$orderId", params: { orderId } });
    } catch (e: any) {
      setError(e?.message ?? "Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  const waLink = (() => {
    if (!settings?.whatsapp_phone) return null;
    const cleanPhone = settings.whatsapp_phone.trim().replace(/\D/g, "");
    const text = `Hello, I want to ask about ${product.title} (₦${product.price_naira.toLocaleString()})`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  })();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-32 sm:pb-6">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-surface">
            {product.signed_image_urls[active] ? (
              <img
                src={product.signed_image_urls[active]}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
            )}
          </div>
          {product.signed_image_urls.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {product.signed_image_urls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border ${i === active ? "border-neon" : "border-border"}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-black sm:text-3xl">{product.title}</h1>
          <div className="mt-2 font-display text-3xl font-black text-neon">
            {formatNaira(product.price_naira)}
          </div>
          {product.stock <= 0 && (
            <div className="mt-2 inline-block rounded bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive">
              Out of stock
            </div>
          )}
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description || "No description."}
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          
          {/* Ask AI Section */}
          <div className="mt-6 rounded-xl border border-neon/30 bg-neon/5 p-4">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-neon">
              <Zap className="h-4 w-4" /> Ask AI about this product
            </h3>
            <div className="mt-2 flex gap-2">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                placeholder="Does this work with iPhone?"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={askingAi || !aiQuestion.trim()}
                onClick={async () => {
                  setAskingAi(true);
                  try {
                    const res = await askAiFn({ data: { question: aiQuestion, productDetails: product } });
                    setAiAnswer(res.answer);
                  } catch (e) {
                    setAiAnswer("Sorry, AI is currently unavailable.");
                  } finally {
                    setAskingAi(false);
                  }
                }}
                className="rounded-md bg-neon px-4 py-2 text-sm font-bold text-neon-foreground disabled:opacity-50"
              >
                {askingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
              </button>
            </div>
            {aiAnswer && (
              <div className="mt-3 rounded-md bg-background/50 p-3 text-sm text-foreground">
                {aiAnswer}
              </div>
            )}
          </div>

          {!user && showGuest && (
            <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Continue as guest
              </p>
              <input
                placeholder="Full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
              />
              <input
                placeholder="Phone (e.g. 08012345678)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="mt-5 hidden gap-3 sm:flex">
            <BuyButtons
              user={!!user}
              showGuest={showGuest}
              setShowGuest={setShowGuest}
              onBuy={handleBuy}
              waLink={waLink}
              submitting={submitting}
              disabled={product.stock <= 0}
            />
          </div>
        </div>
      </div>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <BuyButtons
          user={!!user}
          showGuest={showGuest}
          setShowGuest={setShowGuest}
          onBuy={handleBuy}
          waLink={waLink}
          submitting={submitting}
          disabled={product.stock <= 0}
        />
      </div>
    </div>
  );
}

function BuyButtons({
  user,
  showGuest,
  setShowGuest,
  onBuy,
  waLink,
  submitting,
  disabled,
}: {
  user: boolean;
  showGuest: boolean;
  setShowGuest: (b: boolean) => void;
  onBuy: (asGuest: boolean) => void;
  waLink: string;
  submitting: boolean;
  disabled: boolean;
}) {
  return (
    <>
      <button
        disabled={submitting || disabled}
        onClick={() => {
          if (user) onBuy(false);
          else if (showGuest) onBuy(true);
          else setShowGuest(true);
        }}
        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
        Buy Now
      </button>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 rounded-lg border border-border px-4 py-3 text-center font-semibold text-emerald-500 transition hover:bg-emerald-500/10"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              )}
    </>
  );
}
