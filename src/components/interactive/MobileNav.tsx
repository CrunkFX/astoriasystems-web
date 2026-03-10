import { useState, useEffect, useRef } from 'preact/hooks';

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  locale: string;
  navItems: NavItem[];
  loginLabel: string;
  currentPath: string;
}

export default function MobileNav({ locale, navItems, loginLabel, currentPath }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        class="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {isOpen ? (
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div
            ref={navRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            class="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface)] shadow-2xl lg:hidden overflow-y-auto"
          >
            <div class="flex items-center justify-between p-4 border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)]">
              <span class="text-lg font-semibold">
                Astoria<span class="text-[var(--color-accent)]">Systems</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                class="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav class="p-4 space-y-1" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const isActive = currentPath === item.href || (item.href !== '/' && item.href !== '/en' && currentPath.startsWith(item.href));
                return (
                  <a
                    href={item.href}
                    class={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                        : 'text-[var(--color-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div class="p-4 border-t border-[var(--color-border)] dark:border-[var(--color-dark-border)]">
              <a
                href="https://odoo.astoria.systems"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg glow-btn"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {loginLabel}
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}
