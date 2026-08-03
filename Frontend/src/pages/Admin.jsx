import { NavLink } from 'react-router';
import { Plus, Pencil, Trash2, Video, Trophy, ArrowRight, ShieldCheck } from 'lucide-react';
import AppShell from '../design/AppShell';
import { cn } from '../design/cn';
import { PageBody } from '../design/primitives';

const GROUPS = [
  {
    heading: 'Problem set',
    caption: 'Author and maintain the problems every solver sees.',
    actions: [
      {
        title: 'Add a problem',
        detail: 'Statement, test cases, starter code and reference solutions.',
        icon: Plus,
        tone: 'var(--c-approved)',
        route: '/admin/create',
        cta: 'Author',
      },
      {
        title: 'Edit a problem',
        detail: 'Revise a statement, its cases, hints or solutions.',
        icon: Pencil,
        tone: 'var(--c-brand)',
        route: '/admin/update',
        cta: 'Browse',
      },
      {
        title: 'Walkthrough videos',
        detail: 'Attach or replace the video solution on a problem.',
        icon: Video,
        tone: 'var(--c-caution)',
        route: '/admin/video',
        cta: 'Manage',
      },
      {
        title: 'Delete a problem',
        detail: 'Remove it from the set. Existing submissions are affected.',
        icon: Trash2,
        tone: 'var(--c-redline)',
        route: '/admin/delete',
        cta: 'Remove',
        danger: true,
      },
    ],
  },
  {
    heading: 'Contests',
    caption: 'Timed sets of three problems — one easy, one medium, one hard.',
    actions: [
      {
        title: 'Schedule a contest',
        detail: 'Set the window and author its three problems. Earns you 500 credits.',
        icon: Trophy,
        tone: 'var(--c-caution)',
        route: '/admin/contest/create',
        cta: 'Create',
      },
    ],
  },
];

const ActionCard = ({ title, detail, icon: Icon, tone, route, cta, danger, wide }) => (
  <NavLink
    to={route}
    className={cn(
      'group relative flex flex-col gap-3 overflow-hidden rounded-[16px] border border-rule bg-sheet-raised p-5 transition-all hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-[var(--shadow-lift)]',

      wide && 'sm:col-span-2 xl:col-span-4 xl:flex-row xl:items-center xl:gap-6'
    )}
  >
    <span
      className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60 transition-opacity group-hover:opacity-100"
      style={{
        background: `radial-gradient(120% 100% at 12% 0%, color-mix(in srgb, ${tone} 20%, transparent) 0%, transparent 70%)`,
      }}
      aria-hidden
    />

    <span
      className="relative flex h-11 w-11 items-center justify-center rounded-[13px]"
      style={{
        background: `color-mix(in srgb, ${tone} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 38%, transparent)`,
        color: tone,
      }}
      aria-hidden
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>

    <span className="relative min-w-0 xl:flex-1">
      <span className="t-h3 block text-ink">{title}</span>
      <span className="t-body-sm mt-1 block text-ink-3">{detail}</span>
    </span>

    <span
      className={cn(
        'relative mt-auto inline-flex items-center gap-1.5 pt-1 text-[13px] font-bold',
        wide && 'xl:mt-0 xl:shrink-0 xl:pt-0'
      )}
      style={{ color: danger ? 'var(--c-redline)' : 'var(--c-line)' }}
    >
      {cta}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
        strokeWidth={2.4}
      />
    </span>
  </NavLink>
);

function Admin() {
  return (
    <AppShell>
      <PageBody>
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-brand text-[var(--c-on-brand)]"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="t-h1 text-ink">Admin</h1>
            <p className="t-body text-ink-3">
              Everything here is live for every solver the moment you save it.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-9">
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <div className="mb-3.5">
                <h2 className="t-h3 text-ink">{group.heading}</h2>
                <p className="t-body-sm text-ink-3">{group.caption}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {group.actions.map((a) => (
                  <ActionCard key={a.route} {...a} wide={group.actions.length === 1} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageBody>
    </AppShell>
  );
}

export default Admin;
