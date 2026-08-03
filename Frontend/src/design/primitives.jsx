import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { motion, useReducedMotion } from 'motion/react';
import { cn, difficultyMeta } from './cn';

const BTN_TONE = {

  line:
    'bg-brand text-[var(--c-on-brand)] border-transparent hover:brightness-90 active:brightness-80',
  approved: 'bg-approved text-[var(--c-on-approved)] border-transparent hover:brightness-110',
  redline:  'bg-redline text-[var(--c-on-redline)] border-transparent hover:brightness-110',
  caution:  'bg-caution text-[var(--c-on-caution)] border-transparent hover:brightness-110',
  outline:
    'bg-sheet-raised text-ink border-rule hover:bg-sheet-hover hover:border-rule-strong',
  quiet:    'bg-transparent text-ink-2 border-transparent hover:bg-soft-hover hover:text-ink',
  danger:
    'bg-transparent text-redline border-redline/45 hover:bg-redline hover:text-[var(--c-on-redline)]',
};

const BTN_SIZE = {
  xs: 'h-7 px-2.5 gap-1 rounded-md text-[12px]',
  sm: 'h-8 px-3 gap-1.5 rounded-md text-[13px]',
  md: 'h-9 px-4 gap-1.5 rounded-[10px] text-[13.5px]',
  lg: 'h-11 px-6 gap-2 rounded-[10px] text-[14.5px]',
};

export const Button = forwardRef(function Button(
  { className, tone = 'outline', size = 'md', loading, asChild, children, disabled, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading ? '' : undefined}
      className={cn(
        'relative inline-flex items-center justify-center border font-semibold',
        'select-none whitespace-nowrap transition-all duration-150',
        'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none',
        BTN_SIZE[size],
        BTN_TONE[tone],
        loading && 'plotting text-transparent',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export const Module = forwardRef(function Module(
  { className, ticks = false, as: Comp = 'div', ...props },
  ref
) {
  return (
    <Comp ref={ref} className={cn('sheet', ticks && 'corner-ticks', className)} {...props} />
  );
});

export const ModuleHead = ({ label, right, className, children }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 border-b border-rule-faint px-4 py-2.5',
      className
    )}
  >
    <div className="flex min-w-0 items-center gap-2">
      <span className="t-label truncate text-ink-2">{label}</span>
      {children}
    </div>
    {right ? <div className="flex shrink-0 items-center gap-1.5">{right}</div> : null}
  </div>
);

export const Field = ({ label, value, tone, className, mono = true, title }) => (
  <div className={cn('flex min-w-0 flex-col justify-center px-3 py-1.5', className)} title={title}>
    <span className="t-micro text-ink-3">{label}</span>
    <span
      className={cn('truncate', mono ? 't-data-lg' : 't-body font-semibold')}
      style={tone ? { color: tone } : undefined}
    >
      {value}
    </span>
  </div>
);

export const Chip = ({ children, tone, className, dot = false, ...props }) => (
  <span
    className={cn(
      't-micro inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 leading-none',
      className
    )}
    style={{
      color: tone || 'var(--c-ink-2)',
      borderColor: tone ? `color-mix(in srgb, ${tone} 40%, transparent)` : 'var(--c-rule)',
      backgroundColor: tone
        ? `color-mix(in srgb, ${tone} 13%, transparent)`
        : 'color-mix(in srgb, var(--c-ink) 5%, transparent)',
    }}
    {...props}
  >
    {dot && (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: tone || 'currentColor' }}
      />
    )}
    {children}
  </span>
);

export const DifficultyMark = ({ difficulty, showLabel = true, className }) => {
  const meta = difficultyMeta(difficulty);
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`Difficulty: ${meta.label}`}
    >
      {showLabel ? (
        <span className="text-[12.5px] font-bold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      ) : (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: meta.color }}
          aria-label={meta.label}
        />
      )}
    </span>
  );
};

const STAMP_TONE = {
  approved: 'var(--c-approved)',
  rejected: 'var(--c-redline)',
  caution:  'var(--c-caution)',
  pending:  'var(--c-ink-3)',
};

export const Stamp = ({ verdict = 'approved', label, sub, size = 'md', className }) => {
  const reduce = useReducedMotion();
  const color = STAMP_TONE[verdict] || STAMP_TONE.pending;
  const big = size === 'lg';

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'relative inline-flex select-none flex-col items-center rounded-xl border',
        big ? 'px-8 py-5' : 'px-5 py-3',
        className
      )}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 38%, transparent)`,
        background: `color-mix(in srgb, ${color} 11%, transparent)`,
      }}
      role="status"
    >
      <span className="font-extrabold leading-none" style={{ fontSize: big ? 26 : 17, letterSpacing: '-0.01em' }}>
        {label}
      </span>
      {sub && <span className="t-body-sm mt-1.5 text-ink-2">{sub}</span>}
    </motion.div>
  );
};

const fieldBase =
  'w-full rounded-md border bg-field px-3 text-ink placeholder:text-ink-3 border-rule ' +
  'transition-all outline-none focus:border-line focus:bg-[var(--c-field-focus)] ' +
  'focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-line)_18%,transparent)] ' +
  'disabled:opacity-45 disabled:cursor-not-allowed';

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, 'h-10 t-body', invalid && 'border-redline focus:border-redline', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, 'py-2.5 t-body resize-y', invalid && 'border-redline', className)}
      {...props}
    />
  );
});

export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className={cn(
          fieldBase,
          'h-9 appearance-none pr-8 t-field cursor-pointer',
          '[&>option]:bg-sheet-raised [&>option]:text-ink [&>option]:normal-case'
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-3"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
});

export const FormRow = ({ label, hint, error, required, children, className }) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <div className="flex items-baseline justify-between gap-3">
      <span className="t-label text-ink-2">
        {label}
        {required && <span className="ml-1 text-redline">*</span>}
      </span>
      {hint && <span className="t-micro text-ink-3">{hint}</span>}
    </div>
    {children}
    {error && (
      <span className="t-body-sm flex items-start gap-1.5 text-redline">
        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-redline" aria-hidden />
        {error}
      </span>
    )}
  </div>
);

const NOTE_TONE = {
  redline:  { c: 'var(--c-redline)',  w: 'Error' },
  approved: { c: 'var(--c-approved)', w: 'Success' },
  caution:  { c: 'var(--c-caution)',  w: 'Warning' },
  info:     { c: 'var(--c-line)',     w: 'Note' },
};

export const Note = ({ tone = 'info', title, children, className }) => {
  const t = NOTE_TONE[tone] || NOTE_TONE.info;
  return (
    <div
      className={cn('flex items-start gap-3 rounded-lg border px-3.5 py-2.5', className)}
      style={{
        borderColor: `color-mix(in srgb, ${t.c} 34%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${t.c} 9%, transparent)`,
      }}
      role={tone === 'redline' ? 'alert' : 'status'}
    >
      <span className="t-micro mt-[3px] shrink-0" style={{ color: t.c }}>
        {title || t.w}
      </span>
      <div className="t-body-sm min-w-0 flex-1 text-ink">{children}</div>
    </div>
  );
};

export const Plotter = ({ label = 'Bringing up', className }) => (
  <div className={cn('flex flex-col items-center gap-3.5 py-16', className)}>
    <div className="plotting h-[3px] w-44 bg-rule-faint" role="progressbar" aria-label={label} />
    <span className="t-label text-ink-3">{label}</span>
  </div>
);

export const EmptySheet = ({ title, detail, action, className }) => (
  <div className={cn('flex flex-col items-center gap-4 px-6 py-16 text-center', className)}>
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl border border-rule bg-sheet-sunk"
      aria-hidden
    >
      <span className="font-mono text-lg text-ink-3">—</span>
    </div>
    <div className="flex flex-col gap-1.5">
      <p className="t-h3 text-ink">{title}</p>
      {detail && <p className="t-body-sm max-w-sm text-ink-3">{detail}</p>}
    </div>
    {action}
  </div>
);

export const PageHeader = ({ title, detail, actions, className, children }) => (
  <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="flex min-w-0 flex-col gap-1.5">
      <h1 className="t-h1 text-ink">{title}</h1>
      {detail && <p className="t-body-sm max-w-lg text-ink-2">{detail}</p>}
      {children}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const PageBody = ({ className, width = 'max-w-[1400px]', children }) => (
  <div className={cn('mx-auto w-full px-4 pb-16 pt-5 md:px-8 md:pt-8', width, className)}>
    {children}
  </div>
);

export const Rule = ({ className, strong }) => (
  <div
    className={cn('h-px w-full shrink-0', strong ? 'bg-rule-strong' : 'bg-rule-faint', className)}
    aria-hidden
  />
);

export const DoubleRule = ({ className }) => (
  <div className={cn('flex shrink-0 flex-col gap-[2px]', className)} aria-hidden>
    <div className="h-px w-full bg-rule" />
    <div className="h-px w-full bg-rule-faint" />
  </div>
);
