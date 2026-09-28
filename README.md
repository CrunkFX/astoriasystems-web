# Astoria Systems Website

Modern, high-performance company website for Astoria Systems GmbH. Built with Astro, Tailwind CSS 4, and Preact. Deployed on Ploi (nginx) following the `AstoriaSystems/website-deploy-template` convention.

## Tech Stack

- **Astro 5** - Static-first framework with zero JS by default
- **Tailwind CSS 4** - Utility-first CSS with automatic tree-shaking
- **Preact** - Lightweight interactive islands (theme toggle, mobile nav, language switcher)
- **Ploi** - nginx on the company web server, deployed on push to `main` via GitHub Actions and the Ploi deploy webhook

## Features

- Dark/light mode with system detection
- Fully bilingual (German default + English)
- Glassmorphism design with animated gradients
- Mobile-first responsive design
- Comprehensive SEO (Schema.org, hreflang, OG tags, sitemap)
- Contact form posting to a configurable endpoint (`PUBLIC_CONTACT_ENDPOINT`, see Deployment)
- GDPR compliant (Bunny Fonts, EU hosting, no tracking)
- WCAG accessible
- Lighthouse 95+ target

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
  components/
    layout/      - Header, Footer, MobileNav, SkipLink
    ui/          - Button, GlassCard, Container, Section, StatCard
    sections/    - Hero, Services, Stats, Partners, About, CTA
    interactive/ - ThemeToggle, LanguageSwitcher, MobileNav, ContactForm (Preact)
    seo/         - SEOHead, JsonLd, Breadcrumbs
  i18n/
    config.ts    - Locale definitions, route mapping
    utils.ts     - Translation helper functions
    translations/
      de.json    - German translations
      en.json    - English translations
  layouts/
    BaseLayout.astro  - Main HTML shell
    LegalLayout.astro - Legal pages layout
  pages/
    *.astro      - German pages (default locale, no prefix)
    en/*.astro   - English pages (/en/ prefix)
  styles/
    global.css     - Tailwind imports, theme tokens, glass effects
    animations.css - Scroll reveals, keyframes, glow effects
ploi/
  deploy.sh      - Deploy steps run by Ploi (pnpm install, Astro build, atomic switch to dist/)
  ploi.sh        - Ploi API helper (site-create, nginx-push, env-push, deploy, deploy-script)
  nginx/         - nginx additions (astro.conf) and the full site config (webserver-template.conf)
  .env.production.example - Environment of the Ploi site (SITE_URL, PUBLIC_CONTACT_ENDPOINT)
functions/
  api/
    contact.ts   - Cloudflare Pages Function for the contact form (transition only, see Deployment)
public/
  _headers       - Cloudflare Pages headers (transition only; nginx sets them from ploi/nginx/)
  _redirects     - Cloudflare Pages redirects (transition only; nginx handles them from ploi/nginx/)
  robots.txt     - Crawler instructions
  favicon.svg    - Site favicon
```

## Deployment (Ploi)

The site is hosted on **ploi.io** (nginx, server `as-srv-02`, site `www.astoria.systems`, web directory
`/dist`), following `AstoriaSystems/website-deploy-template`. Ploi pulls `main` on every deployment and
runs the site's deploy script:

```bash
cd {SITE_DIRECTORY}      # with zero-downtime deployment: cd {RELEASE}
git pull origin {BRANCH}
bash ploi/deploy.sh
```

[`ploi/deploy.sh`](ploi/deploy.sh) builds on the server (`pnpm install --frozen-lockfile`, `astro build`
into `.dist-next`, smoke checks, `bereitstellung.txt` with the commit) and switches atomically to `dist/`.
Node ≥ 22.12 is required (Astro 6); the server runs Node 24, `.nvmrc` matches it.

### Site setup (once)

1. *Add site* → *Advanced*: domain `www.astoria.systems`, **web directory `/dist`**, webserver template
   "Astro static" (or paste [`ploi/nginx/webserver-template.conf`](ploi/nginx/webserver-template.conf)
   under Site → *Manage* → *NGINX configuration* afterwards), *Create system user* on. Add the alias
   `astoria.systems` (Site → *Aliases*).
2. *Repository*: this repo, branch `main`, deploy script as above. Keep *Quick Deploy* off: the CI
   workflow triggers the deploy webhook only after a green build.
3. *Environment*: contents of [`ploi/.env.production.example`](ploi/.env.production.example).
4. *SSL* → Let's Encrypt for `www.astoria.systems,astoria.systems` once DNS points to the server. Ploi then
   redirects http → https and `astoria.systems` → `www.astoria.systems` itself (the site is named `www.*`),
   so the nginx config contains no host redirect of its own.
5. Optional: *Settings* → Zero-Downtime deployment; the deploy script then starts with `cd {RELEASE}`.

Alternatively: `bash ploi/ploi.sh site-create --env-file ploi/.env.site` or the *Ploi* workflow under
Actions (needs `PLOI_API_TOKEN` / `PLOI_SERVER_ID`).

### nginx

Pages are built as `produkte/index.html` (Astro's default `build.format: 'directory'`) but addressed
without a trailing slash (`trailingSlash: 'never'`, matching canonical and hreflang). Ploi's plain "Astro
static" template would redirect `/produkte` to `/produkte/`, i.e. the canonical URL itself, so
[`ploi/nginx/astro.conf`](ploi/nginx/astro.conf) serves `/produkte` from `produkte/index.html` directly and
redirects `/produkte/` → `/produkte`. It also carries what used to live in `public/_headers` and
`public/_redirects`: HSTS and the redirects of the old Odoo URLs (`/our-services` → `/produkte`, …).
Install once with `bash ploi/ploi.sh nginx-push` or use the full
[`ploi/nginx/webserver-template.conf`](ploi/nginx/webserver-template.conf); `deploy.sh` reports after
every run whether the additions are present (marker `# astoriasystems-web nginx`).

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) builds every push and pull request (pnpm, Node
from `.nvmrc`) and checks that the build is complete and that canonical and sitemap use `SITE_URL`
(repository variable, default `https://www.astoria.systems`). On `main` it then POSTs the Ploi deploy
webhook (secret `PLOI_DEPLOY_WEBHOOK_URL`, Ploi → Site → *Repository*). Without the secret the build
still runs and the deployment is skipped with a warning.

### Contact form

`src/components/interactive/ContactFormHandler.tsx` posts JSON `{name, email, phone?, company, subject,
message}` to `PUBLIC_CONTACT_ENDPOINT` (Ploi environment). On Ploi there is no Cloudflare Pages Function,
so the endpoint has to be provided elsewhere – intended: the portal (`https://portal.astoria.systems/api/kontakt`),
which must answer 2xx on success and allow the origin `https://www.astoria.systems` via CORS
(preflight `OPTIONS`, `Content-Type: application/json`). Without the variable the form posts to
`/api/contact`, i.e. the Cloudflare Pages Function.

### Transition from Cloudflare Pages

`wrangler.jsonc`, `functions/api/contact.ts`, `public/_headers` and `public/_redirects` stay in the
repository until DNS points to the Ploi server, so the Cloudflare deployment keeps working meanwhile;
`ploi/deploy.sh` removes `_headers`/`_redirects` from the Ploi build. After the switch: delete these files,
the Cloudflare Pages project and the `RESEND_API_KEY`/SMTP variables there.

## Adding Content

### New Language

1. Create `src/i18n/translations/{locale}.json`
2. Add locale to `src/i18n/config.ts` (locales array, routeMap, localeLabels)
3. Update `astro.config.mjs` i18n config
4. Create page files under `src/pages/{locale}/`

### New Page

1. Create `src/pages/{slug}.astro` (German) and `src/pages/en/{slug}.astro` (English)
2. Add route to `routeMap` in `src/i18n/config.ts`
3. Add navigation entry in `getNavItems()` if needed
4. Add translations to both JSON files

## Logo

Replace the text-based logo placeholder in `Header.astro` and `Footer.astro` with your SVG logo files.

## Commands

| Command | Action |
|---------|--------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server at localhost:4321 |
| `pnpm build` | Build production site to ./dist/ |
| `pnpm preview` | Preview production build locally |
