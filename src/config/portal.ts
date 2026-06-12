// Zentrale Konfiguration der Frappe-Portal-Anbindung.
// PORTAL_URL = öffentliche Basis-URL der Frappe-Instanz, auf die
// Helpdesk/Wiki/Konto direkt verlinken. In der Dev-Umgebung anpassen,
// sobald Frappe erreichbar ist (z. B. https://erp.astoria.systems).
export const PORTAL_URL = 'https://erp.astoria.systems';

export interface PortalLink {
  label: string;
  labelEn: string;
  href: string;
}

// Links, die eingeloggten Nutzern im Header-Menü angeboten werden.
export const PORTAL_LINKS: PortalLink[] = [
  { label: 'Helpdesk', labelEn: 'Helpdesk', href: `${PORTAL_URL}/helpdesk` },
  { label: 'Wiki', labelEn: 'Wiki', href: `${PORTAL_URL}/wiki` },
  { label: 'Mein Konto', labelEn: 'My Account', href: `${PORTAL_URL}/me` },
];
