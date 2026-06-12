export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

export const localeLabels: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
};

export const routeMap: Record<Locale, Record<string, string>> = {
  de: {
    home: '/',
    products: '/produkte',
    'products.communication': '/produkte/kommunikation',
    'products.security': '/produkte/it-sicherheit',
    'products.infrastructure': '/produkte/infrastruktur',
    'products.development': '/produkte/entwicklung',
    pricing: '/preise',
    about: '/ueber-uns',
    contact: '/kontakt',
    jobs: '/jobs',
    terms: '/agb',
    privacy: '/datenschutz',
    imprint: '/impressum',
  },
  en: {
    home: '/en',
    products: '/en/products',
    'products.communication': '/en/products/communication',
    'products.security': '/en/products/security',
    'products.infrastructure': '/en/products/infrastructure',
    'products.development': '/en/products/development',
    pricing: '/en/pricing',
    about: '/en/about',
    contact: '/en/contact',
    jobs: '/en/jobs',
    terms: '/en/terms',
    privacy: '/en/privacy',
    imprint: '/en/imprint',
  },
};

/** Reverse lookup: given a path, find which route key it corresponds to */
export function getRouteKeyFromPath(locale: Locale, path: string): string | undefined {
  const routes = routeMap[locale];
  const normalized = path.replace(/\/$/, '') || '/';
  return Object.keys(routes).find((key) => routes[key] === normalized);
}

/** Get the equivalent path in another locale */
export function getAlternatePath(currentPath: string, fromLocale: Locale, toLocale: Locale): string {
  const routeKey = getRouteKeyFromPath(fromLocale, currentPath);
  if (routeKey && routeMap[toLocale][routeKey]) {
    return routeMap[toLocale][routeKey];
  }
  return routeMap[toLocale].home;
}

/** Navigation items for header */
export function getNavItems(locale: Locale) {
  const routes = routeMap[locale];
  const labels = locale === 'de'
    ? {
        home: 'Home',
        products: 'Produkte',
        pricing: 'Preise',
        about: 'Über uns',
        contact: 'Kontakt',
      }
    : {
        home: 'Home',
        products: 'Products',
        pricing: 'Pricing',
        about: 'About',
        contact: 'Contact',
      };

  return Object.entries(labels).map(([key, label]) => ({
    label,
    href: routes[key],
  }));
}
