// ============================================================
// Referenzen / Case Studies – zentrale Datenquelle (Template)
// ------------------------------------------------------------
// NEUE REFERENZ HINZUFÜGEN:
//   1. Bilder unter public/images/references/ ablegen
//      (App-Screenshots, Kundenfoto, Logo …).
//   2. Unten ein neues Objekt in `caseStudies` ergänzen –
//      Felder analog zum mkmScan-Beispiel ausfüllen.
//   testimonial, gallery und links sind optional.
// Alle Texte sind zweisprachig: { de, en }.
// ============================================================

export interface Bilingual {
  de: string;
  en: string;
}

export interface RefLink {
  label: string;
  href: string;
}

export interface RefImage {
  src: string; // Pfad unter /public, z. B. /images/references/...
  alt: string;
  fit?: 'cover' | 'contain'; // contain = App-Screenshots, cover = Fotos/Logos
}

export interface Testimonial {
  person: string;
  role: Bilingual;
  photo?: string;
  quote: Bilingual;
  interview?: { q: Bilingual; a: Bilingual }[];
}

export interface CaseStudy {
  slug: string;
  tag: Bilingual;
  title: Bilingual;
  lead: Bilingual;
  bullets: { de: string[]; en: string[] };
  links?: RefLink[];
  gallery?: RefImage[];
  // Kundenlogo mit Theme-Varianten (light = für hellen Hintergrund)
  clientLogo?: { light: string; dark: string; alt: string };
  testimonial?: Testimonial;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'mkmscan',
    tag: { de: 'Case Study · iOS · LiDAR', en: 'Case study · iOS · LiDAR' },
    title: {
      de: 'mkmScan – Wohnflächenberechnung per LiDAR',
      en: 'mkmScan – floor area calculation via LiDAR',
    },
    lead: {
      de: 'Für die mkm International GmbH haben wir mkmScan entwickelt – eine iOS-App, die mit dem Apple-LiDAR-Scanner direkt aus dem Raum heraus die Wohnfläche berechnet. Durch die Kombination aus 3D-Scan und Texturerfassung erreicht die App eine Genauigkeit und Auswertungstiefe, die es in dieser Form am Markt bislang nicht gab.',
      en: 'For mkm International GmbH we built mkmScan – an iOS app that uses the Apple LiDAR scanner to calculate floor area directly from the room. By combining 3D scanning with texture capture, the app achieves a level of accuracy and analysis that did not exist in this form on the market.',
    },
    bullets: {
      de: [
        'Direkte Wohnflächenberechnung per iPhone – ohne Maßband oder Zusatzhardware',
        'Apple-LiDAR kombiniert mit Texturerfassung für hohe Genauigkeit',
        'Auswertung und Aufmaß direkt in der App',
      ],
      en: [
        'Direct floor area calculation on iPhone – no tape measure or extra hardware',
        'Apple LiDAR combined with texture capture for high accuracy',
        'Analysis and measurement right inside the app',
      ],
    },
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/de/app/mkmscan/id6736586301' },
      { label: 'Immobilienmesse', href: 'https://immobilienmesse.de/produkte/mkmscan' },
      { label: 'mkmfloor.de', href: 'https://www.mkmfloor.de/' },
    ],
    clientLogo: {
      light: '/images/references/mkmfloor-dunkel.webp',
      dark: '/images/references/mkmfloor-hell.webp',
      alt: 'mkmFloor',
    },
    gallery: [
      { src: '/images/references/mkmscan-1.webp', alt: 'mkmScan App – Screenshot 1', fit: 'contain' },
      { src: '/images/references/mkmscan-2.webp', alt: 'mkmScan App – Screenshot 2', fit: 'contain' },
      { src: '/images/references/mkmscan-3.webp', alt: 'mkmScan App – Screenshot 3', fit: 'contain' },
      { src: '/images/references/mkmscan-4.webp', alt: 'mkmScan App – Screenshot 4', fit: 'contain' },
      { src: '/images/references/mkmscan-5.webp', alt: 'mkmScan App – Screenshot 5', fit: 'contain' },
      { src: '/images/references/mkmscan-6.webp', alt: 'mkmScan App – Screenshot 6', fit: 'contain' },
      { src: '/images/references/mkmscan-7.webp', alt: 'mkmScan App – Screenshot 7', fit: 'contain' },
      { src: '/images/references/mkmscan-8.webp', alt: 'mkmScan App – Screenshot 8', fit: 'contain' },
      { src: '/images/references/mkmscan-9.webp', alt: 'mkmScan App – Screenshot 9', fit: 'contain' },
    ],
    testimonial: {
      person: 'Markus G. Schlegel',
      role: { de: 'CSO, mkm International GmbH', en: 'CSO, mkm International GmbH' },
      photo: '/images/references/markus-schlegel.jpg',
      quote: {
        de: '„Das Team von Astoria Systems hat mit mkmScan etwas umgesetzt, das es so am Markt nicht gibt: eine direkte, verlässliche Wohnflächenberechnung allein per Smartphone. Die Verbindung aus Apple-LiDAR und Texturerfassung hebt Genauigkeit und Auswertung auf ein völlig neues Niveau – technologisch ein echter Sprung und in der Umsetzung herausragend."',
        en: '“With mkmScan, the team at Astoria Systems delivered something the market simply didn’t have: reliable floor area calculation from a smartphone alone. Combining Apple LiDAR with texture capture takes accuracy and analysis to a whole new level – a real technological leap, brilliantly executed.”',
      },
      interview: [
        {
          q: { de: 'Was macht mkmScan besonders?', en: 'What makes mkmScan special?' },
          a: {
            de: '„Wir vermessen Wohnflächen heute direkt mit dem iPhone – ohne Maßband, ohne Zusatzgeräte. Dass das in dieser Präzision funktioniert, war noch vor Kurzem undenkbar."',
            en: '“We now measure floor areas directly with an iPhone – no tape measure, no extra devices. That this works at such precision was unthinkable not long ago.”',
          },
        },
        {
          q: { de: 'Wie war die Zusammenarbeit mit Astoria Systems?', en: 'How was working with Astoria Systems?' },
          a: {
            de: '„Hervorragend. Das Team hat die LiDAR-Technologie nicht nur beherrscht, sondern mit der Texturauswertung clever weitergedacht – schnell, lösungsorientiert und auf einem technisch sehr hohen Niveau."',
            en: '“Excellent. The team not only mastered the LiDAR technology but cleverly extended it with texture analysis – fast, solution-oriented and at a very high technical level.”',
          },
        },
      ],
    },
  },
];

// Allgemeine Leistungs-/Schwerpunkt-Karten (keine konkreten Projekte)
export const focusAreas: { tag: Bilingual; title: Bilingual; desc: Bilingual }[] = [
  {
    tag: { de: 'Kommunikation', en: 'Communication' },
    title: { de: 'Unternehmensweite Kommunikationsplattform', en: 'Company-wide communication platform' },
    desc: {
      de: 'VoIP-Telefonie, Team- und Kundenchat sowie KI-gestützte Bots – interne und externe Kommunikation aus einer Hand.',
      en: 'VoIP telephony, team and customer chat plus AI-powered bots – internal and external communication from a single source.',
    },
  },
  {
    tag: { de: 'IT-Sicherheit', en: 'IT security' },
    title: { de: 'Sichere, DSGVO-konforme Infrastruktur', en: 'Secure, GDPR-compliant infrastructure' },
    desc: {
      de: 'Härtung, Verschlüsselung und kontinuierliches Monitoring für ausfallsichere Systeme mit Hosting in der EU.',
      en: 'Hardening, encryption and continuous monitoring for resilient systems hosted in the EU.',
    },
  },
  {
    tag: { de: 'Infrastruktur', en: 'Infrastructure' },
    title: { de: 'Skalierbare Cloud- & Server-Landschaften', en: 'Scalable cloud & server landscapes' },
    desc: {
      de: 'Planung, Migration und Betrieb performanter Infrastruktur – flexibel mitwachsend mit dem Unternehmen.',
      en: 'Planning, migration and operation of high-performance infrastructure that grows with your business.',
    },
  },
  {
    tag: { de: 'Software', en: 'Software' },
    title: { de: 'Individuelle Software, Web- & Mobile-Apps', en: 'Custom software, web & mobile apps' },
    desc: {
      de: 'Maßgeschneiderte ERP-/CRM-Systeme und Anwendungen, exakt auf bestehende Prozesse zugeschnitten.',
      en: 'Tailored ERP/CRM systems and applications, built precisely around your existing processes.',
    },
  },
];
