import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  locale: string;
  navItems: NavItem[];
  currentPath: string;
  /** Kundencenter auf cp.astoria.systems — anderer Host, daher absolute Adresse. */
  portalHref?: string;
  portalLabel?: string;
}

export default function MobileNav({ locale, navItems, currentPath, portalHref, portalLabel }: Props) {
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div
            ref={navRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            class="fixed top-0 right-0 bottom-0 z-[70] w-72 max-w-[85vw] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface)] shadow-2xl lg:hidden overflow-y-auto"
          >
            <div class="flex items-center justify-between p-4 border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)]">
              <img src="/logo-light.svg" alt="Astoria Systems" class="h-8 w-auto dark:hidden" />
              <img src="/logo-dark.svg" alt="Astoria Systems" class="h-8 w-auto hidden dark:block" />
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

              {portalHref && (
                <a
                  href={portalHref}
                  class="mt-3 block rounded-lg border border-[#0f7d87]/40 dark:border-[var(--color-accent)]/30 px-3 py-2.5 text-center text-sm font-medium text-[#0f7d87] dark:text-[var(--color-accent)] hover:bg-[#0f7d87]/10 dark:hover:bg-[var(--color-accent)]/10 transition-colors"
                >
                  {portalLabel}
                </a>
              )}
            </nav>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
