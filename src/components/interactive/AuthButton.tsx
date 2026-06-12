import { useState, useEffect, useRef } from 'preact/hooks';
import { PORTAL_LINKS } from '../../config/portal';

interface Props {
  locale: string;
  loginLabel: string;
}

interface Me {
  loggedIn: boolean;
  name?: string;
  email?: string;
  picture?: string;
}

const loginIcon = (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

export default function AuthButton({ locale, loginLabel }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isEn = locale === 'en';

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { loggedIn: false }))
      .then(setMe)
      .catch(() => setMe({ loggedIn: false }));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';
  const loginHref = `/api/auth/login?next=${encodeURIComponent(currentPath)}`;
  const logoutHref = `/api/auth/logout?next=${encodeURIComponent(currentPath)}`;

  // Bis der Status geladen ist (oder ausgeloggt): Login-Button zeigen.
  if (!me || !me.loggedIn) {
    return (
      <a
        href={loginHref}
        class="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg glow-btn"
      >
        {loginIcon}
        {loginLabel}
      </a>
    );
  }

  const firstName = (me.name || '').trim().split(' ')[0] || me.email || '';
  const initial = (firstName[0] || '?').toUpperCase();
  const greeting = isEn ? 'Hi' : 'Hallo';

  return (
    <div ref={ref} class="hidden lg:block relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-primary)] dark:text-[var(--color-dark-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-light)] text-[#052b30] text-xs font-bold">
          {initial}
        </span>
        <span>
          {greeting} {firstName}
        </span>
        <svg
          class={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          class="glass absolute right-0 mt-2 w-56 rounded-xl py-2 shadow-lg z-50"
        >
          {me.email && (
            <div class="px-4 py-2 text-xs text-[var(--color-text-tertiary)] dark:text-[var(--color-dark-text-tertiary)] truncate border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)] mb-1">
              {me.email}
            </div>
          )}
          {PORTAL_LINKS.map((l) => (
            <a
              href={l.href}
              role="menuitem"
              class="block px-4 py-2 text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors"
            >
              {isEn ? l.labelEn : l.label}
            </a>
          ))}
          <div class="my-1 border-t border-[var(--color-border)] dark:border-[var(--color-dark-border)]"></div>
          <a
            href={logoutHref}
            role="menuitem"
            class="block px-4 py-2 text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {isEn ? 'Sign out' : 'Abmelden'}
          </a>
        </div>
      )}
    </div>
  );
}
