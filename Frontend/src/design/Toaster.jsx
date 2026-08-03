import { Toaster as Sonner, toast } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={44}
      gap={6}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'sheet tooth corner-ticks shadow-[var(--shadow-lift)] flex items-start gap-2.5 px-3 py-2.5 w-full',
          title: 't-body font-semibold text-ink',
          description: 't-body-sm text-ink-2 mt-0.5',
          success:
            '!border-approved/45 !bg-[color-mix(in_srgb,var(--c-approved)_9%,var(--c-sheet-raised))]',
          error:
            '!border-redline/45 !bg-[color-mix(in_srgb,var(--c-redline)_9%,var(--c-sheet-raised))]',
          warning:
            '!border-caution/45 !bg-[color-mix(in_srgb,var(--c-caution)_9%,var(--c-sheet-raised))]',
          info:
            '!border-line/45 !bg-[color-mix(in_srgb,var(--c-line)_9%,var(--c-sheet-raised))]',
          actionButton:
            't-micro border border-rule-strong px-2 py-1 text-ink hover:bg-sheet-hover transition-colors',
          cancelButton:
            't-micro border border-rule px-2 py-1 text-ink-3 hover:text-ink transition-colors',
          closeButton: 'border border-rule bg-sheet-raised text-ink-3 hover:text-ink',
        },
      }}
    />
  );
}

export { toast };
