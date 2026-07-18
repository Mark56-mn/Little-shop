import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getSettings } from "@/lib/shop.functions";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-gradient-neon">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-neon px-4 py-2 text-sm font-bold text-neon-foreground shadow-neon"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-neon px-4 py-2 text-sm font-bold text-neon-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TrendRush NG — Naija's hottest deals, delivered fast" },
      {
        name: "description",
        content:
          "TrendRush NG: shop gadgets on PlugMarket and viral picks on HotPick NG. Bank transfer checkout, WhatsApp support.",
      },
      { name: "theme-color", content: "#0A0A0F" },
      { property: "og:title", content: "TrendRush NG — Naija's hottest deals, delivered fast" },
      { property: "og:description", content: "TrendRush NG is a modern Nigerian e-commerce web app for buying gadgets, trending deals, and viral products." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TrendRush NG — Naija's hottest deals, delivered fast" },
      { name: "description", content: "TrendRush NG is a modern Nigerian e-commerce web app for buying gadgets, trending deals, and viral products." },
      { name: "twitter:description", content: "TrendRush NG is a modern Nigerian e-commerce web app for buying gadgets, trending deals, and viral products." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dVeo7KYNOUZU0l2qmkKMtvGL8z42/social-images/social-1781947197981-1000061254.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dVeo7KYNOUZU0l2qmkKMtvGL8z42/social-images/social-1781947197981-1000061254.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

function Shell() {
  const router = useRouter();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TrendRush NG · PlugMarket · HotPick NG
      </footer>
      <WhatsAppFab phone={settings?.whatsapp_phone} />
    </div>
  );
}
