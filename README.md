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
- Contact form sent via the Lettermint API (`server/kontakt.php`, see Deployment)
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
server/
  kontakt.php    - Contact form handler behind nginx (POST /api/contact → Lettermint), outside dist/
  kontakt.test.mjs - Tests: real PHP (php -S) against a fake Lettermint endpoint (`pnpm test`)
ploi/
  deploy.sh      - Deploy steps run by Ploi (pnpm install, Astro build, atomic switch to dist/)
  ploi.sh        - Ploi API helper (site-create, nginx-push, env-push, deploy, deploy-script)
  nginx/         - nginx additions (astro.conf) and the full site config (webserver-template.conf)
  .env.production.example - Environment of the Ploi site (SITE_URL, Lettermint token and addresses)
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

0. *Server* → *PHP*: install PHP 8.5 on the web server (as-srv-02 has no PHP yet). Only the contact form
   needs it; the site itself stays static, and other static sites keep PHP "none".
1. *Add site* → *Advanced*: domain `www.astoria.systems`, **web directory `/dist`**, **PHP version 8.5**
   (creates the PHP-FPM pool `php8.5-fpm-<system user>` for `/api/contact`), webserver template
   "Astro static" (or paste [`ploi/nginx/webserver-template.conf`](ploi/nginx/webserver-template.conf)
   under Site → *Manage* → *NGINX configuration* afterwards), *Create system user* on. Add the alias
   `astoria.systems` (Site → *Aliases*).
2. *Repository*: this repo, branch `main`, deploy script as above. Keep *Quick Deploy* off: the CI
   workflow triggers the deploy webhook only after a green build.
3. *Environment*: contents of [`ploi/.env.production.example`](ploi/.env.production.example), with the
   Lettermint sending token filled in. The token lives only there, never in the repository.
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
Everything stays static except one location: `POST /api/contact` goes to `server/kontakt.php` through the
site's PHP-FPM pool (placeholders `{SYSTEM_USER}`/`{DOMAIN}`, filled by `deploy.sh` and `nginx-push`).
Install once with `bash ploi/ploi.sh nginx-push` or use the full
[`ploi/nginx/webserver-template.conf`](ploi/nginx/webserver-template.conf); `deploy.sh` reports after
every run whether the additions are present (marker `# astoriasystems-web nginx`).

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) builds every push and pull request (pnpm, Node
from `.nvmrc`) and checks that the build is complete and that canonical and sitemap use `SITE_URL`
(repository variable, default `https://www.astoria.systems`). A second job lints `server/kontakt.php` on
PHP 8.5 and runs its tests (`pnpm test`). On `main`, after both are green, it POSTs the Ploi deploy
webhook (secret `PLOI_DEPLOY_WEBHOOK_URL`, Ploi → Site → *Repository*). Without the secret the build
still runs and the deployment is skipped with a warning.

### Contact form

`src/components/interactive/ContactFormHandler.tsx` posts JSON `{name, email, phone?, company, subject,
message, website}` to `/api/contact` – the same path as the former Cloudflare Pages Function, so the form
works on both during the transition. `website` is a honeypot field that stays empty for humans.

On Ploi, nginx hands that path to [`server/kontakt.php`](server/kontakt.php) (outside `dist/`, never
served). The script validates the request, rate-limits it (5 per address in 10 minutes, 60 per hour in
total), and sends it through the Lettermint API to `CONTACT_EMAIL` with `Reply-To` set to the sender, so a
reply goes straight back. Settings come from the site's `.env` (`LETTERMINT_TOKEN`, optional
`LETTERMINT_ROUTE_ID`, `MAIL_FROM`, `CONTACT_EMAIL`, see
[`ploi/.env.production.example`](ploi/.env.production.example)). Form contents never go to the log.
`deploy.sh` warns when the PHP-FPM pool or the token is missing.

Responses: `200 {"success":true}`, otherwise `{"error":…}` with 400/403/405/413/415/429/500/502.
Tests: `pnpm test` (needs PHP ≥ 8.1 with curl locally).

### Transition from Cloudflare Pages

`wrangler.jsonc`, `functions/api/contact.ts`, `public/_headers` and `public/_redirects` stay in the
repository until DNS points to the Ploi server, so the Cloudflare deployment keeps working meanwhile;
`ploi/deploy.sh` removes `_headers`/`_redirects` from the Ploi build. After the switch: delete these files,
the Cloudflare Pages project and the SMTP variables there; `server/kontakt.php` replaces the function.

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
