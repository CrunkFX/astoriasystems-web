// ============================================================
// Expertise / Themen-Seiten – zentrale Datenquelle (Template)
// ------------------------------------------------------------
// Jeder Eintrag erzeugt:
//   - eine Karte auf der Übersicht /expertise
//   - eine eigene Artikel-Seite /expertise/<slug> (DE) bzw.
//     /en/expertise/<slug> (EN)
//
// NEUES THEMA: Objekt in `expertiseAreas` ergänzen. Pflicht:
//   slug, category, title, summary, lead, tags, icon, sections.
//   image (Hero) und logos (Tech-Wall) sind optional.
// Bilder: /public/images/expertise/  ·  Logos: /public/images/tech/
// ============================================================

export interface Bilingual {
  de: string;
  en: string;
}

export interface ArticleSection {
  heading: Bilingual;
  body: Bilingual;
  bullets?: { de: string[]; en: string[] };
}

export interface ExpertiseArea {
  slug: string;
  category: Bilingual;
  title: Bilingual;
  summary: Bilingual; // kurz, für die Übersichtskarte
  lead: Bilingual; // Einleitung auf der Artikel-Seite
  tags: string[];
  icon: string; // innerer Inhalt eines <svg> (heroicons outline)
  image?: string; // Hero-Bild, /public/images/expertise/
  logos?: { src: string; alt: string }[]; // Tech-Logos, /public/images/tech/
  sections: ArticleSection[];
}

const ICONS = {
  server:
    '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7" />',
  shield:
    '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />',
  chip:
    '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />',
};

export const expertiseAreas: ExpertiseArea[] = [
  {
    slug: 'proxmox',
    category: { de: 'Virtualisierung & Storage', en: 'Virtualization & Storage' },
    title: { de: 'Proxmox-Support & -Rescue', en: 'Proxmox Support & Rescue' },
    summary: {
      de: 'Planung, Betrieb, Optimierung und Notfall-Recovery von Proxmox-Umgebungen – mit tiefer Erfahrung in Proxmox VE, LINSTOR und Ceph.',
      en: 'Planning, operation, optimization and emergency recovery of Proxmox environments – with deep experience in Proxmox VE, LINSTOR and Ceph.',
    },
    lead: {
      de: 'Proxmox VE ist das Herzstück moderner, kosteneffizienter Virtualisierung – wenn es richtig aufgesetzt und betrieben wird. Wir begleiten Sie über den gesamten Lebenszyklus: von der Architektur über den stabilen Betrieb bis zum Notfall-Recovery, wenn es wirklich darauf ankommt.',
      en: 'Proxmox VE is the heart of modern, cost-efficient virtualization – when it is set up and operated correctly. We support you across the entire lifecycle: from architecture and stable operation to emergency recovery when it really matters.',
    },
    tags: ['Proxmox VE', 'LINSTOR', 'DRBD', 'Ceph', 'HA-Cluster', 'Storage-Recovery'],
    icon: ICONS.server,
    image: '/images/expertise/proxmox.webp',
    logos: [
      { src: '/images/tech/proxmox.svg', alt: 'Proxmox' },
      { src: '/images/tech/linstor.svg', alt: 'LINSTOR' },
      { src: '/images/tech/ceph.svg', alt: 'Ceph' },
    ],
    sections: [
      {
        heading: { de: 'Proxmox-Cluster richtig aufgebaut', en: 'Proxmox clusters done right' },
        body: {
          de: 'Ein stabiler Cluster beginnt beim Design: getrennte Netze für Corosync, Storage und Management, sauberes Quorum, durchdachtes Storage-Layout und ein Backup-Konzept, das im Ernstfall wirklich trägt. Wir planen und bauen Proxmox-Umgebungen, die unter Last und im Fehlerfall verlässlich bleiben.',
          en: 'A stable cluster starts with the design: separate networks for Corosync, storage and management, clean quorum, a well-thought-out storage layout and a backup concept that actually holds up. We plan and build Proxmox environments that stay reliable under load and during failures.',
        },
        bullets: {
          de: ['Cluster- & Netzwerk-Design (Corosync, VLANs, Bonding)', 'Hochverfügbarkeit & Live-Migration', 'Backup-/Restore-Strategie (Proxmox Backup Server)'],
          en: ['Cluster & network design (Corosync, VLANs, bonding)', 'High availability & live migration', 'Backup/restore strategy (Proxmox Backup Server)'],
        },
      },
      {
        heading: { de: 'Software-defined Storage: LINSTOR & Ceph', en: 'Software-defined storage: LINSTOR & Ceph' },
        body: {
          de: 'Für echte Hochverfügbarkeit zählt der Storage. Wir setzen LINSTOR/DRBD für performante, blockbasierte Replikation und Ceph für skalierbaren, verteilten Storage ein – inklusive Tuning, Monitoring und sauberer Integration in Proxmox. So bleiben VMs auch beim Ausfall einzelner Knoten verfügbar.',
          en: 'For true high availability, storage is key. We use LINSTOR/DRBD for performant, block-based replication and Ceph for scalable, distributed storage – including tuning, monitoring and clean integration into Proxmox. This keeps VMs available even when individual nodes fail.',
        },
      },
      {
        heading: { de: 'Rescue & Disaster Recovery', en: 'Rescue & disaster recovery' },
        body: {
          de: 'Wenn es brennt, zählt jede Minute. Wir analysieren gezielt, retten VMs und Daten, lösen Split-Brain- und Quorum-Probleme, reparieren degradierte Ceph-Cluster und bringen den Betrieb schnellstmöglich zurück – anschließend härten wir die Umgebung, damit es nicht wieder passiert.',
          en: 'When things go wrong, every minute counts. We diagnose precisely, recover VMs and data, resolve split-brain and quorum issues, repair degraded Ceph clusters and restore operations as fast as possible – then we harden the environment so it does not happen again.',
        },
        bullets: {
          de: ['Cluster down, Split-Brain, defektes Quorum', 'Degradierte/„down" OSDs, Ceph-Recovery', 'Performance-Einbrüche & Storage-Engpässe', 'Migration von VMware/Hyper-V zu Proxmox'],
          en: ['Cluster down, split-brain, broken quorum', 'Degraded/“down” OSDs, Ceph recovery', 'Performance drops & storage bottlenecks', 'Migration from VMware/Hyper-V to Proxmox'],
        },
      },
    ],
  },
  {
    slug: 'industrie-it-security',
    category: { de: 'OT & IT-Sicherheit', en: 'OT & IT Security' },
    title: { de: 'Industrielle Infrastruktur & IT-Security', en: 'Industrial Infrastructure & IT Security' },
    summary: {
      de: 'Planung, Betrieb und Absicherung von Infrastruktur und IT-Equipment in industriellen und unternehmenskritischen Umgebungen.',
      en: 'Planning, operating and securing infrastructure and IT equipment in industrial and business-critical environments.',
    },
    lead: {
      de: 'Industrielle und unternehmenskritische IT stellt besondere Anforderungen an Verfügbarkeit, Robustheit und Sicherheit. Wir verbinden klassische IT-Security mit dem Verständnis für OT, Anlagen und industrielles Equipment – und schützen, was Ihren Betrieb am Laufen hält.',
      en: 'Industrial and business-critical IT places special demands on availability, robustness and security. We combine classic IT security with a real understanding of OT, plants and industrial equipment – protecting what keeps your operation running.',
    },
    tags: ['OT-Security', 'Netzsegmentierung', 'Hardening', 'Monitoring', 'Industrie-IT', 'Firewalling'],
    icon: ICONS.shield,
    image: '/images/expertise/industrial.webp',
    sections: [
      {
        heading: { de: 'OT/IT-Konvergenz sicher gestalten', en: 'Securing OT/IT convergence' },
        body: {
          de: 'Produktions- und Büro-IT wachsen zusammen – mit allen Chancen und Risiken. Wir trennen Netze sauber, definieren klare Übergänge zwischen OT und IT und sorgen dafür, dass Angriffsflächen minimiert werden, ohne die Produktion auszubremsen.',
          en: 'Production and office IT are converging – with all the opportunities and risks that brings. We segment networks cleanly, define clear boundaries between OT and IT and minimize the attack surface without slowing down production.',
        },
        bullets: {
          de: ['Netzsegmentierung & Zonenkonzepte (z. B. Purdue-Modell)', 'Sichere Fernwartung & Zugriffskontrolle', 'Firewalling zwischen OT und IT'],
          en: ['Network segmentation & zoning (e.g. Purdue model)', 'Secure remote maintenance & access control', 'Firewalling between OT and IT'],
        },
      },
      {
        heading: { de: 'Härtung, Monitoring & Reaktion', en: 'Hardening, monitoring & response' },
        body: {
          de: 'Wir härten Systeme und Equipment, etablieren kontinuierliches Monitoring und sorgen dafür, dass Auffälligkeiten früh erkannt werden. Im Ernstfall unterstützen wir bei Analyse und Wiederherstellung – damit aus einem Vorfall kein Stillstand wird.',
          en: 'We harden systems and equipment, establish continuous monitoring and ensure anomalies are detected early. In an incident we support analysis and recovery – so an event does not turn into downtime.',
        },
      },
      {
        heading: { de: 'Robuste Infrastruktur für raue Umgebungen', en: 'Robust infrastructure for harsh environments' },
        body: {
          de: 'Industrielle Standorte verzeihen keine fragile Technik. Wir planen und betreiben Infrastruktur, die mit Staub, Temperatur, Vibration und Dauerlast zurechtkommt – mit der nötigen Redundanz und Ausfallsicherheit für den 24/7-Betrieb.',
          en: 'Industrial sites do not tolerate fragile technology. We plan and operate infrastructure that copes with dust, temperature, vibration and continuous load – with the redundancy and resilience required for 24/7 operation.',
        },
      },
    ],
  },
  {
    slug: 'hardware-iot',
    category: { de: 'Embedded & Automation', en: 'Embedded & Automation' },
    title: { de: 'Hardware & IoT-Automation', en: 'Hardware & IoT Automation' },
    summary: {
      de: 'Entwicklung und Integration von IoT- und Hardware-Lösungen – von Sensorik und Edge bis zur Anbindung an Ihre Plattformen.',
      en: 'Development and integration of IoT and hardware solutions – from sensors and edge to integration with your platforms.',
    },
    lead: {
      de: 'Von der Hardware-Auswahl bis zur vernetzten Automatisierung: Wir entwickeln und integrieren Lösungen, die Sensorik, Steuerung und Software nahtlos verbinden – mit tiefer Erfahrung im hardwarenahen Engineering und in der IoT-Automation.',
      en: 'From hardware selection to connected automation: we develop and integrate solutions that seamlessly link sensors, control and software – with deep experience in hardware-level engineering and IoT automation.',
    },
    tags: ['IoT', 'Embedded', 'Sensorik', 'Edge', 'MQTT', 'Automatisierung'],
    icon: ICONS.chip,
    image: '/images/expertise/iot.webp',
    sections: [
      {
        heading: { de: 'Von der Hardware-Auswahl zum Produkt', en: 'From hardware selection to product' },
        body: {
          de: 'Wir helfen bei der Auswahl der richtigen Hardware, der Integration von Sensorik und Steuerung und der Entwicklung robuster Geräte – mit Blick auf Zuverlässigkeit, Stückkosten und Wartbarkeit über den gesamten Lebenszyklus.',
          en: 'We help select the right hardware, integrate sensors and control, and develop robust devices – with an eye on reliability, unit cost and maintainability across the entire lifecycle.',
        },
      },
      {
        heading: { de: 'Edge, Datenerfassung & Automatisierung', en: 'Edge, data acquisition & automation' },
        body: {
          de: 'Daten dort verarbeiten, wo sie entstehen: Wir realisieren Edge-Lösungen mit zuverlässiger Datenerfassung, lokaler Vorverarbeitung und Automatisierungslogik – effizient, ausfallsicher und auch bei wackeliger Konnektivität stabil.',
          en: 'Process data where it is created: we build edge solutions with reliable data acquisition, local pre-processing and automation logic – efficient, resilient and stable even with flaky connectivity.',
        },
        bullets: {
          de: ['Sensorik & Datenerfassung', 'Edge-Computing & lokale Vorverarbeitung', 'Protokolle wie MQTT, Modbus, OPC UA'],
          en: ['Sensors & data acquisition', 'Edge computing & local pre-processing', 'Protocols such as MQTT, Modbus, OPC UA'],
        },
      },
      {
        heading: { de: 'Sichere Anbindung an Ihre Systeme', en: 'Secure integration with your systems' },
        body: {
          de: 'Geräte sind nur so wertvoll wie ihre Integration. Wir binden IoT-Lösungen sicher an Ihre Plattformen, Datenbanken und Prozesse an – verschlüsselt, skalierbar und mit sauberem Monitoring der gesamten Flotte.',
          en: 'Devices are only as valuable as their integration. We connect IoT solutions securely to your platforms, databases and processes – encrypted, scalable and with clean fleet-wide monitoring.',
        },
      },
    ],
  },
];

export function getArea(slug: string): ExpertiseArea | undefined {
  return expertiseAreas.find((a) => a.slug === slug);
}
