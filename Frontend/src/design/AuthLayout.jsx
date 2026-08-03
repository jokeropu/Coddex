import { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Sun, Moon, TerminalSquare, Gauge, Bot, Trophy,
  PlaySquare, MessagesSquare, Save, Check,
} from 'lucide-react';
import hero from '../assets/hero.png';
import { cn } from './cn';
import { Input } from './primitives';
import { useGround } from './ground';

const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'C'];

const CAPABILITIES = [
  {
    icon: Gauge,
    title: 'A judge that actually grades',
    body: 'Run against the visible cases, then submit against the full hidden suite. Every verdict reports runtime and memory.',
  },
  {
    icon: TerminalSquare,
    title: 'Five languages, one editor',
    body: 'A full code editor in the browser with per-language starter code and syntax intelligence.',
  },
  {
    icon: Bot,
    title: 'An assistant that read the problem',
    body: 'Stuck at 1am? Ask for a nudge from an assistant scoped to the exact problem you are on.',
  },
  {
    icon: Trophy,
    title: 'Timed contests and rating',
    body: 'Enter a contest, submit under the clock, and watch the standings resolve. Your rating follows you.',
  },
  {
    icon: PlaySquare,
    title: 'Editorials and walkthroughs',
    body: 'Hints, reference solutions and video explanations for the moment reading the statement again stops helping.',
  },
  {
    icon: MessagesSquare,
    title: 'Every approach, compared',
    body: 'Discussion on each problem, so you see the approach you did not think of.',
  },
];

function BrandPanel() {
  return (
    <aside className="brand-panel hidden flex-col justify-between overflow-hidden px-11 py-11 xl:px-14 lg:flex">
      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/90">
          <img src={hero} alt="" className="h-6 w-6" />
        </span>
        <span className="text-[19px] font-extrabold leading-none tracking-[-0.01em]">Coddex</span>
      </div>

      <div className="relative">
        <h2
          className="max-w-[13ch] text-balance font-extrabold tracking-[-0.035em]"
          style={{ fontSize: 'clamp(38px, 4.4vw, 54px)', lineHeight: 1.05 }}
        >
          Practice. Compete. Get hired.
        </h2>
        <p className="mt-5 max-w-[34ch] text-[15.5px] leading-relaxed text-white/85">
          A real judge, timed contests, and help the moment you are stuck — across five languages.
        </p>

        <ul className="mt-8 flex flex-col gap-2.5">
          {CAPABILITIES.slice(0, 3).map(({ icon: Icon, title }) => (
            <li key={title} className="flex items-center gap-2.5 text-[14.5px] text-white/90">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              {title}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        {LANGUAGES.map((l) => (
          <span
            key={l}
            className="rounded-md bg-white/12 px-2.5 py-1 font-mono text-[11.5px] text-white/90"
          >
            {l}
          </span>
        ))}
      </div>
    </aside>
  );
}

export function GoogleBlock({ children }) {
  const slot = useRef(null);
  const [rendered, setRendered] = useState(true);

  useEffect(() => {
    const check = () => {
      const el = slot.current;
      if (el) setRendered(el.getBoundingClientRect().height > 8);
    };
    const t = setTimeout(check, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={rendered ? undefined : 'hidden'}>
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-rule" aria-hidden />
        <span className="t-micro text-ink-3">or</span>
        <div className="h-px flex-1 bg-rule" aria-hidden />
      </div>
      {/* Google's own iframe often has a slightly larger white bounding box
          than the button graphic it draws, which shows as a pale sliver
          around the button on a dark card. Clipping to the button's own
          rounded corners hides that without touching Google's markup. */}
      <div ref={slot} className="flex justify-center">
        <div className="inline-block overflow-hidden rounded-[4px] border border-white">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PasswordField({ register, name, placeholder, invalid, autoComplete }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        {...register(name)}
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        invalid={invalid}
        autoComplete={autoComplete}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-ink"
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { ground, toggle } = useGround();

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <BrandPanel />

      <div className="flex flex-col items-center justify-center gap-6 px-4 py-10 lg:px-10">
        <div className="w-full max-w-[26rem]">
          <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-2">
              <img src={hero} alt="" className="h-6 w-6" />
              <span className="text-[16px] font-extrabold leading-none text-ink">
                Coddex
              </span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="text-ink-3 transition-colors hover:text-ink"
              aria-label={ground === 'night' ? 'Bring up the day' : 'Fade to night'}
            >
              {ground === 'night'
                ? <Sun className="h-3.5 w-3.5" strokeWidth={1.75} />
                : <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />}
            </button>
          </div>

          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="t-h1 text-ink">{title}</h1>
            {subtitle && <p className="t-body text-ink-3">{subtitle}</p>}
          </div>

          {children}

          <div className="mt-6 border-t border-rule pt-4 text-center">
            {footer}
          </div>
        </div>

        <div className="w-full max-w-[26rem] lg:hidden">
          <ul className="flex flex-col gap-2">
            {CAPABILITIES.slice(0, 3).map(({ icon: Icon, title: heading, body }) => (
              <li key={heading} className="sheet flex gap-3 p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/12">
                  <Icon className="h-4 w-4 text-line" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <h3 className="t-body font-semibold text-ink">{heading}</h3>
                  <p className="t-body-sm mt-0.5 text-ink-3">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
