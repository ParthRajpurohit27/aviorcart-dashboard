# AVIORCART Dashboard (separate repo)

Admin panel: orders, products, themes, analytics.

## How publishing works
Dashboard → `/api/products` (checks your Supabase login) → GitHub commit on the **main website repo** → Vercel redeploys the main site (~1 min).
Images: file picker (multiple) or links → `/api/upload-image` → imgbb → link stored in the product.

## Vercel env (this dashboard project)
GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_DEFAULT_BRANCH (main),
IMGBB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
optional ADMIN_EMAILS (comma separated; default = oldest Supabase user, needs AVIORCART_SERVICE_ROLE_KEY).

## One-time
Run `supabase-setup.sql` in Supabase → SQL Editor (orders RLS + store_settings for themes).

## Build
`npm i && npm run build` compiles `src/**/*.ts` → `assets/dist/*.js` (commit the output).
