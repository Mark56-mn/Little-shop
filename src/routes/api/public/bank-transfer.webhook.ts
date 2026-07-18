import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Bank transfer webhook endpoint for automated payment confirmation.
 * This endpoint accepts webhook calls from your bank or payment service provider.
 * 
 * Supported sources:
 * - Mono (Nigerian bank aggregator)
 * - Flutterwave Bank Transfer notifications
 * - Custom bank APIs
 * 
 * POST /api/public/bank-transfer/webhook
 * Body: {
 *   "event": "transfer_received" | "payment_confirmed",
 *   "order_id": "uuid",
 *   "amount": number,
 *   "reference": string,
 *   "source": "mono" | "flutterwave" | "custom",
 *   "signature": "hmac-signature"
 * }
 */

export const Route = createFileRoute("/api/public/bank-transfer/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        // Verify signature if provided
        const secret = process.env.BANK_WEBHOOK_SECRET;
        if (secret && payload?.signature) {
          const { source, event, order_id, amount, reference } = payload;
          const dataToSign = `${source}:${event}:${order_id}:${amount}:${reference}`;
          const expected = createHmac("sha256", secret).update(dataToSign).digest("hex");

          const sig = Buffer.from(payload.signature);
          const exp = Buffer.from(expected);
          if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const { event, order_id, source } = payload;

        if (event === "transfer_received" || event === "payment_confirmed") {
          if (order_id) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            // Record webhook event
            await supabaseAdmin.from("bank_transfer_webhooks").insert({
              order_id,
              webhook_source: source || "custom",
              webhook_data: payload,
              payment_confirmed: true,
              confirmed_at: new Date().toISOString(),
            });

            // Update order status
            const { data: order } = await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid" })
              .eq("id", order_id)
              .select("id")
              .maybeSingle();

            if (order?.id) {
              // Award points if applicable
              await supabaseAdmin.rpc("settle_paid_order", { _order_id: order.id });
            }

            console.log(`[bank-webhook] Payment confirmed for order ${order_id} via ${source}`);
          }
        }

        return new Response("ok");
      },
    },
  },
});
