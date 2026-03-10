import { getAlternatePath } from '../../i18n/config';
import type { Locale } from '../../i18n/config';

interface Props {
  locale: Locale;
  currentPath: string;
}

export default function LanguageSwitcher({ locale, currentPath }: Props) {
  const targetLocale: Locale = locale === 'de' ? 'en' : 'de';
  const targetPath = getAlternatePath(currentPath, locale, targetLocale);
  const label = locale === 'de' ? 'EN' : 'DE';
  const ariaLabel = locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln';

  return (
    <a
      href={targetPath}
      aria-label={ariaLabel}
      title={ariaLabel}
      class="flex h-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-[var(--color-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      {label}
    </a>
  );
}
