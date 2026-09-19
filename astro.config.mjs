// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.astoria.systems',

  /**
   * Adressform: ohne abschliessenden Schraegstrich, eine Datei je Seite.
   *
   * Vorher stand hier nichts, also galt Astros Vorgabe 'ignore' — und die
   * beiden Erzeuger entschieden sich unterschiedlich:
   *
   *   Canonical   https://www.astoria.systems/produkte
   *   Sitemap     https://www.astoria.systems/produkte/
   *
   * Dieselbe Seite unter zwei Adressen, und die Sitemap meldete der
   * Suchmaschine die Form, die das Canonical ausschliesst.
   *
   * Gewaehlt ist die Form **ohne** Schraegstrich, weil das Canonical sie schon
   * nennt und damit indexiert ist. Andersherum waere jede Adresse der Seite
   * eine andere geworden.
   *
   * Die Verzeichnisausgabe bleibt, build.format wird **nicht** auf 'file'
   * gestellt. Zwei Gruende:
   *
   *   - Mit 'file' endet Astro.url.pathname auf .html, und das Canonical hiesse
   *     /produkte.html — wieder eine zweite Schreibweise derselben Seite.
   *   - Mit 'file' entstuende en.html neben dem Verzeichnis en/, und fuer
   *     diese Kollision braeuchte es DirectorySlash Off. Ohne 'file' gibt es
   *     sie nicht.
   *
   * Apache liefert /produkte aus dem Verzeichnis aus, ohne Umleitung — die
   * Regel dafuer steht in public/.htaccess.
   */
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
