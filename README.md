# Astoria Systems Website

Modern, high-performance company website for Astoria Systems GmbH. Built with Astro, Tailwind CSS 4, and Preact. Deployed on Cloudflare Pages.

## Tech Stack

- **Astro 5** - Static-first framework with zero JS by default
- **Tailwind CSS 4** - Utility-first CSS with automatic tree-shaking
- **Preact** - Lightweight interactive islands (theme toggle, mobile nav, language switcher)
- **Cloudflare Pages** - Edge deployment with auto-deploy on push

## Features

- Dark/light mode with system detection
- Fully bilingual (German default + English)
- Glassmorphism design with animated gradients
- Mobile-first responsive design
- Comprehensive SEO (Schema.org, hreflang, OG tags, sitemap)
- Contact form via Cloudflare Pages Function
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
functions/
  api/
    contact.ts   - Cloudflare Pages Function for contact form
public/
  _headers       - Security and cache headers
  _redirects     - Legacy URL redirects
  robots.txt     - Crawler instructions
  favicon.svg    - Site favicon
```

## Deployment to Cloudflare Pages

### Via Git Integration (Recommended)

1. Push this repo to GitHub
2. In Cloudflare Dashboard > Pages > Create Project
3. Connect your GitHub repo
4. Build settings:
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Node.js version: Set `NODE_VERSION=20` in environment variables
5. Deploy

### Via Wrangler CLI

```bash
npx wrangler pages deploy dist
```

### Environment Variables

For the contact form to send emails, set these in Cloudflare Pages settings:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from resend.com for email delivery |
| `CONTACT_EMAIL` | Email address to receive form submissions (default: service@astoria.systems) |

### Custom Domain

1. In Cloudflare Pages project settings > Custom domains
2. Add `astoria.systems` and `www.astoria.systems`
3. DNS will be configured automatically if domain is on Cloudflare

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
