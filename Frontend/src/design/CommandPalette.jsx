import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import * as Dlg from '@radix-ui/react-dialog';
import {
  Search, LayoutList, Flame, Trophy, Medal, LineChart,
  Settings as SettingsIcon, ShieldCheck, Sun, Moon, CornerDownLeft,
} from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { cn, problemNo, difficultyMeta } from './cn';
import { useGround } from './ground';

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { ground, toggle } = useGround();
  const { user } = useSelector((state) => state.auth);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let ignore = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await axiosClient.get('/problem/getAllProblem', {
          params: { page: 1, search: query.trim(), difficulty: 'all', tags: 'all', status: 'all' },
        });
        if (!ignore) setResults((data.problems || []).slice(0, 7));
      } catch {
        if (!ignore) setResults([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 220);
    return () => { ignore = true; clearTimeout(t); };
  }, [query, open]);

  const go = (path) => { onOpenChange(false); navigate(path); };

  const ROUTES = [
    { icon: LayoutList, label: 'Problems', hint: 'All problems', path: '/' },
    { icon: Flame, label: 'Daily Challenge', hint: 'Today’s problem', path: '/daily-challenge' },
    { icon: Trophy, label: 'Contests', hint: 'Timed problem sets', path: '/contests' },
    { icon: Medal, label: 'Rating Leaderboard', path: '/leaderboard' },
    { icon: LineChart, label: 'Progress', hint: 'Your submissions', path: '/progress' },
    { icon: ShieldCheck, label: 'Premium', path: '/premium' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
    ...(user?.role === 'admin' ? [{ icon: ShieldCheck, label: 'Admin', path: '/admin' }] : []),
  ];

  return (
    <Dlg.Root open={open} onOpenChange={onOpenChange}>
      <Dlg.Portal>
        <Dlg.Overlay className="anim-overlay fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--c-sheet-sunk)_82%,transparent)] backdrop-blur-[2px]" />
        <Dlg.Content
          className={cn(
            'sheet tooth corner-ticks anim-dialog fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl',
            '-translate-x-1/2 shadow-[var(--shadow-lift)] focus:outline-none'
          )}
          aria-label="Jump to problem"
        >
          <Dlg.Title className="sr-only">Jump to sheet</Dlg.Title>
          <Dlg.Description className="sr-only">
            Search problems by number or title, or jump to a section.
          </Dlg.Description>

          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-2.5 border-b border-rule bg-sheet-sunk px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search problems by number or title…"
                className="t-body h-11 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
              />
              {loading && <div className="plotting h-[2px] w-8 shrink-0 bg-rule-faint" />}
            </div>

            <Command.List className="max-h-80 overflow-y-auto p-1">
              <Command.Empty className="t-body-sm px-3 py-8 text-center text-ink-3">
                {query.trim().length < 2 ? 'Type at least two characters.' : 'No problem matches that.'}
              </Command.Empty>

              {results.length > 0 && (
                <Command.Group
                  heading="Problems"
                  className="[&_[cmdk-group-heading]]:t-micro [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-ink-3"
                >
                  {results.map((p) => {
                    const meta = difficultyMeta(p.difficulty);
                    return (
                      <Command.Item
                        key={p._id}
                        value={`problem-${p._id}`}
                        onSelect={() => go(`/problem/${p._id}`)}
                        className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 outline-none data-[selected=true]:bg-sheet-hover"
                      >
                        <span className="t-data shrink-0 text-ink-3">{problemNo(p.problemNumber)}</span>
                        <span className="t-body min-w-0 flex-1 truncate text-ink">{p.title}</span>
                        <span className="t-micro shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:t-micro [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-ink-3"
              >
                {ROUTES.filter(
                  (r) => !query.trim() || r.label.toLowerCase().includes(query.trim().toLowerCase())
                ).map((r) => (
                  <Command.Item
                    key={r.path}
                    value={`route-${r.path}`}
                    onSelect={() => go(r.path)}
                    className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 outline-none data-[selected=true]:bg-sheet-hover"
                  >
                    <r.icon className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
                    <span className="t-body flex-1 text-ink">{r.label}</span>
                    {r.hint && <span className="t-micro text-ink-3">{r.hint}</span>}
                  </Command.Item>
                ))}

                <Command.Item
                  value="toggle-ground"
                  onSelect={() => { toggle(); onOpenChange(false); }}
                  className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 outline-none data-[selected=true]:bg-sheet-hover"
                >
                  {ground === 'night'
                    ? <Sun className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
                    : <Moon className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />}
                  <span className="t-body flex-1 text-ink">
                    {ground === 'night' ? 'Bring up the day' : 'Fade to night'}
                  </span>
                </Command.Item>
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-rule bg-sheet-sunk px-3 py-1.5">
              <span className="t-micro text-ink-3">Sheet jump</span>
              <span className="t-micro flex items-center gap-1 text-ink-3">
                <CornerDownLeft className="h-3 w-3" strokeWidth={1.75} /> to open
              </span>
            </div>
          </Command>
        </Dlg.Content>
      </Dlg.Portal>
    </Dlg.Root>
  );
}
