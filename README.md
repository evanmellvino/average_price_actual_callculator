# Average Price Calculator

Kalkulator harga wajar saham berbasis PER dan PBV dengan akun Supabase, penyimpanan saham dan riwayat.

## Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Create the database tables and row-level security policies by running `supabase/schema.sql` in the Supabase SQL Editor.

## Production deployment (Vercel)

- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Vercel project environment variables for Production, Preview, and Development as needed.
- To enable AI thesis review, add `OPENAI_API_KEY` as a server-only Vercel environment variable. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`). Never use a `VITE_` prefix for the AI key.
- In Supabase Authentication URL Configuration, add the deployed site URL to Site URL and Redirect URLs.
- `vercel.json` configures SPA route fallback and the service worker response headers.

Never put the Supabase `service_role` key in the browser app or in a `VITE_` variable.
