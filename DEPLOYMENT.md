# Deploying PlugMart

PlugMart is a TanStack Start app (Vite + Nitro). The Lovable build targets
Cloudflare by default; the config files here switch Nitro to the right target
for Vercel and Render using the `NITRO_PRESET` environment variable.

## Required environment variables

Set these on the host. The `VITE_*` values are public (safe in the browser);
the rest are server-only secrets.

| Variable | Purpose | Public? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Backend URL (browser) | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (browser) | yes |
| `VITE_SUPABASE_PROJECT_ID` | Project ref (browser) | yes |
| `SUPABASE_URL` | Backend URL (server) | no |
| `SUPABASE_PUBLISHABLE_KEY` | Anon key (server) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server only) | no |
| `RAPIDAPI_KEY` / `RAPIDAPI_HOST` | AliExpress import | no |

The `VITE_SUPABASE_*` values already live in this project's `.env` file — copy
them from there into your host's env settings. The service role key is stored securely 
in the backend and is not printed anywhere; recreate it on the host from your own records.

## Vercel

1. Import the repository into Vercel.
2. `vercel.json` sets the build command and `NITRO_PRESET=vercel`.
3. Add the environment variables above in Project Settings → Environment Variables.
4. Deploy.

## Render

1. Create a new **Web Service** from the repository (or use `render.yaml` as a Blueprint).
2. Build: `npm install && npm run build` — Start: `node .output/server/index.mjs`.
3. `NITRO_PRESET=node-server` is set in `render.yaml`.
4. Add the environment variables above.
5. Deploy.
