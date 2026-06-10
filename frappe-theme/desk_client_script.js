// ============================================================
// Astoria Systems – Desk Branding via Client Script
// ------------------------------------------------------------
// EINFACHSTER WEG ohne Server-/App-Zugriff: injiziert das
// Desk-CSS app-weit.
//
// So einrichten (Frappe 16):
//   1. Im Desk nach "Client Script" suchen -> Neu.
//   2. "Enabled" = an.
//   3. "Script Type" = "App"   (NICHT "Form"/"List" – "App"
//      lädt das Script auf jeder Desk-Seite).
//   4. Den kompletten Inhalt dieser Datei einfügen.
//   5. Speichern, dann Desk neu laden (Strg/Cmd + Shift + R).
//
// HINWEIS: Für eine saubere Produktions-Lösung gehört das CSS
// besser in eine eigene App via hooks.py:
//   app_include_css = ["/assets/<deine_app>/css/desk_theme.css"]
// Dann ist kein Client Script nötig.
// ============================================================

frappe.ready?.(() => {});

(function injectAstoriaDeskTheme() {
  const CSS = `
@import url('https://fonts.bunny.net/css?family=inter:300,400,500,600,700,800');
:root{
  --ci-accent:#00e5ff;--ci-accent-light:#3fe0d0;--ci-accent-dark:#2e9aa0;
  --ci-text:#4f4f4f;--ci-surface:#fff;--ci-surface-2:#f8fafc;
  --ci-surface-3:#f1f5f9;--ci-border:#e2e8f0;--ci-dark-bg:#030712;
  --primary:var(--ci-accent-dark);--primary-color:var(--ci-accent-dark);
  --blue-500:var(--ci-accent-dark);--blue-600:var(--ci-accent-dark);
  --bg-color:var(--ci-surface-2);--fg-color:var(--ci-surface);
  --card-bg:var(--ci-surface);--control-bg:var(--ci-surface-3);
  --navbar-bg:var(--ci-surface);--modal-bg:var(--ci-surface);
  --text-color:var(--ci-text);--text-muted:#6b7280;
  --heading-color:var(--ci-dark-bg);--border-color:var(--ci-border);
  --border-radius:.5rem;--border-radius-lg:.75rem;
  --font-stack:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
}
body,.desk-page,.layout-main{font-family:var(--font-stack)!important;-webkit-font-smoothing:antialiased;}
.navbar{background:var(--ci-surface)!important;border-bottom:1px solid var(--ci-border)!important;}
.btn-primary{background:linear-gradient(135deg,var(--ci-accent),var(--ci-accent-light))!important;border:none!important;color:#052b30!important;font-weight:600;}
.btn-primary:hover,.btn-primary:focus{color:#052b30!important;box-shadow:0 4px 18px rgba(0,229,255,.35)!important;}
.standard-sidebar-item.selected{background:rgba(0,229,255,.1);}
.standard-sidebar-item.selected .sidebar-item-label{color:var(--ci-accent-dark);font-weight:600;}
.widget,.form-section,.frappe-card,.dashboard-card{border-radius:var(--border-radius-lg);border-color:var(--ci-border);}
.form-control:focus{border-color:var(--ci-accent)!important;box-shadow:0 0 0 2px rgba(0,229,255,.25)!important;}
::selection{background-color:var(--ci-accent);color:#fff;}
`;
  if (document.getElementById('astoria-desk-theme')) return;
  const style = document.createElement('style');
  style.id = 'astoria-desk-theme';
  style.textContent = CSS;
  document.head.appendChild(style);
})();
