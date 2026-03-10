import { useState } from 'preact/hooks';

interface Props {
  locale: string;
  labels: {
    name: string;
    email: string;
    phone: string;
    company: string;
    subject: string;
    message: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
  };
}

export default function ContactFormHandler({ locale, labels }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setStatus('sending');

    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div class="rounded-xl p-8 text-center glass">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10 mb-4">
          <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p class="text-lg font-medium">{labels.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label for="name" class="block text-sm font-medium mb-1.5">{labels.name} *</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
          />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium mb-1.5">{labels.email} *</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
          />
        </div>
        <div>
          <label for="phone" class="block text-sm font-medium mb-1.5">{labels.phone}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
          />
        </div>
        <div>
          <label for="company" class="block text-sm font-medium mb-1.5">{labels.company} *</label>
          <input
            type="text"
            id="company"
            name="company"
            required
            class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
          />
        </div>
      </div>
      <div>
        <label for="subject" class="block text-sm font-medium mb-1.5">{labels.subject} *</label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
        />
      </div>
      <div>
        <label for="message" class="block text-sm font-medium mb-1.5">{labels.message} *</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          class="w-full rounded-lg border border-[var(--color-border)] dark:border-[var(--color-dark-border)] bg-[var(--color-surface-primary)] dark:bg-[var(--color-dark-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors resize-y"
        />
      </div>

      {status === 'error' && (
        <div class="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-700 dark:text-red-400">
          {labels.error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        class="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-medium glow-btn disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
