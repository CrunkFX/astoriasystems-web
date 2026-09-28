// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Kanonische Adresse (Canonical, hreflang, Open Graph, Sitemap) aus SITE_URL: aus der Umgebung
 * (ploi/deploy.sh exportiert sie), sonst aus .env (Ploi → Site → Environment, lokal .env),
 * sonst die Produktionsadresse. Ohne Slash am Ende. Kein `loadEnv` aus vite: mit pnpm ist vite
 * hier nicht direkt auflösbar.
 */
function siteUrl() {
  let value = process.env.SITE_URL;
  if (!value) {
    try {
      const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
      value = env.match(/^SITE_URL=["']?([^"'\s]+)/m)?.[1];
    } catch {
      // keine .env – Rückfall unten
    }
  }
  return (value ?? '').replace(/\/+$/, '') || 'https://www.astoria.systems';
}

export default defineConfig({
  site: siteUrl(),
  // Adressen ohne Slash am Ende, wie Canonical und hreflang (SEOHead) sie bilden; damit nennt auch die
  // Sitemap /produkte statt /produkte/. Die Seiten liegen weiter als produkte/index.html (build.format
  // 'directory') – nginx liefert sie ohne Umleitung aus (ploi/nginx/).
  trailingSlash: 'never',
  integrations: [
    preact(),
    sitemap({
      i18n: {
        defaultLocale: 'de',
        locales: {
          de: 'de-DE',
          en: 'en-US',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    locales: ['de', 'en'],
    defaultLocale: 'de',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
