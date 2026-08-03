import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import { Search, X, Check, ChevronRight, ChevronLeft, Flame } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import ProblemTable from '../components/ProblemTable';
import { cn, difficultyMeta, topicHue } from '../design/cn';
import {
  Module, ModuleHead, Button, Input, NativeSelect, Chip,
  DifficultyMark, Plotter, EmptySheet, Rule,
} from '../design/primitives';
import { Dialog, DialogContent, DialogTrigger } from '../design/overlays';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

const HERO_BAR = { easy: '#7cf0aa', medium: '#ffd07a', hard: '#ffa8b4' };

const TAGS = [
  { value: 'all', label: 'All Tags' },
  { value: 'arrays', label: 'Arrays' },
  { value: 'strings', label: 'Strings' },
  { value: 'dynamic programming', label: 'DP' },
  { value: 'graphs', label: 'Graphs' },
  { value: 'trees', label: 'Trees' },
  { value: 'maths', label: 'Maths' },
  { value: 'linkedlists', label: 'Linked Lists' },
  { value: 'stacks', label: 'Stacks' },
  { value: 'queues', label: 'Queues' },
  { value: 'hashing', label: 'Hashing' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'recursion', label: 'Recursion' },
];

const CREDIT_CRITERIA = [
  { credits: '+10', label: 'Solve the Daily Challenge', detail: "Once per day, for an accepted submission on that day's featured problem within its 24-hour window." },
  { credits: '+100', label: '7-day streak milestone', detail: 'Recurring bonus every 7 consecutive days of solving the Daily Challenge.' },
  { credits: '+1,000', label: '30-day streak milestone', detail: 'Recurring bonus every 30 consecutive days of solving the Daily Challenge.' },
  { credits: '+20,000', label: '365-day streak', detail: 'One-time bonus for a full year of consecutive daily solves. The streak resets to 0 afterward.' },
  { credits: '+200', label: 'Contest rank 1–3', detail: 'Awarded after a contest ends, only if you attempted it (made at least one submission).' },
  { credits: '+100', label: 'Contest rank 4–10', detail: 'Same as above — requires having attempted the contest.' },
  { credits: '+50', label: 'Contest rank 11–20', detail: 'Same as above — requires having attempted the contest.' },
  { credits: '+500', label: 'Create a contest (admins)', detail: 'Awarded to the admin immediately after successfully creating a contest.' },
];

const CompletionScale = ({ counts, solvedByDifficulty, total }) => {
  const keys = ['easy', 'medium', 'hard'];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 w-full overflow-hidden border border-rule bg-sheet-sunk">
        {keys.map((k) => {
          const solved = solvedByDifficulty[k] || 0;
          const pct = total > 0 ? (solved / total) * 100 : 0;
          return (
            <div
              key={k}
              style={{ width: `${pct}%`, background: difficultyMeta(k).color }}
              className="h-full transition-[width] duration-500"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <DifficultyMark difficulty={k} />
            <span className="t-data text-ink-2">
              {solvedByDifficulty[k] || 0}
              <span className="text-ink-3">/{counts[k] || 0}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

function Homepage() {
  const { user } = useSelector((state) => state.auth);
  const [problems, setProblems] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    tag: 'all',
    status: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [categoryCounts, setCategoryCounts] = useState({ difficulty: {}, tags: {} });
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: 'number', desc: false }]);
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    let ignore = false;
    axiosClient
      .get('/daily-challenge/today')
      .then(({ data }) => { if (!ignore) setDaily(data); })

      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchProblems = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get('/problem/getAllProblem', {
          params: {
            page,
            difficulty: filters.difficulty,
            tags: filters.tag,
            status: filters.status,
            search: filters.search,
            sort: sorting[0]?.id ?? 'number',
            order: sorting[0]?.desc ? 'desc' : 'asc',
          },
        });
        if (ignore) return;
        setProblems(data.problems);
        setTotalPages(data.totalPages);
        setTotalProblems(data.totalProblems);
        setGrandTotal(data.grandTotal);
      } catch (error) {
        if (!ignore) console.error('Error fetching problems:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchProblems();
    return () => { ignore = true; };
  }, [page, filters, sorting]);

  const updateFilters = (updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setSearchParams({ page: '1' });
  };

  const handleSortingChange = (updater) => {
    setSorting((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next.length ? next : [{ id: 'number', desc: false }];
    });
    setSearchParams({ page: '1' });
  };

  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timeout = setTimeout(() => updateFilters({ search: searchInput }), 300);
    return () => clearTimeout(timeout);

  }, [searchInput]);

  useEffect(() => {
    const fetchSolvedProblems = async () => {
      try {
        const { data } = await axiosClient.get('/problem/problemSolvedByUser');
        setSolvedProblems(data);
      } catch (error) {
        console.error('Error fetching solved problems:', error);
      }
    };
    if (user) fetchSolvedProblems();
  }, [user]);

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const { data } = await axiosClient.get('/problem/categoryCounts');
        setCategoryCounts(data);
      } catch (error) {
        console.error('Error fetching category counts:', error);
      }
    };
    fetchCategoryCounts();
  }, []);

  const solvedIds = useMemo(
    () => new Set(solvedProblems.map((sp) => sp._id)),
    [solvedProblems]
  );

  const solvedByDifficulty = useMemo(() => {
    const acc = { easy: 0, medium: 0, hard: 0 };
    for (const p of solvedProblems) {
      const k = String(p.difficulty || '').toLowerCase();
      if (k in acc) acc[k] += 1;
    }
    return acc;
  }, [solvedProblems]);

  const filtersActive =
    filters.difficulty !== 'all' || filters.tag !== 'all' || filters.status !== 'all' || !!filters.search;

  return (
    <AppShell solvedCount={solvedProblems.length} onCreditsInfo={() => setCreditsOpen(true)}>
      <div className="brand-panel">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-7 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="min-w-0">
            <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              {user?.firstName ? `Welcome back, ${user.firstName}` : 'Problems'}
            </h1>
            <p className="mt-2 text-[15px] text-white/85">
              Pick a problem, write a solution, submit it to the judge.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-end gap-x-9 gap-y-4">
            <div>
              <p className="font-mono text-[27px] font-semibold leading-none">
                {solvedProblems.length}
                <span className="text-[17px] text-white/60">/{grandTotal}</span>
              </p>
              <p className="mt-1.5 text-[12.5px] text-white/75">Solved</p>
              <div className="mt-2 flex h-1.5 w-[220px] max-w-full overflow-hidden rounded-full bg-white/25">
                {['easy', 'medium', 'hard'].map((k) => (
                  <span
                    key={k}
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${grandTotal > 0 ? ((solvedByDifficulty[k] || 0) / grandTotal) * 100 : 0}%`,
                      background: HERO_BAR[k],
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[27px] font-semibold leading-none">
                {user?.dailyStreak ?? 0}
              </p>
              <p className="mt-1.5 text-[12.5px] text-white/75">Day streak</p>
            </div>

            {typeof user?.contestRating === 'number' && (
              <div>
                <p className="font-mono text-[27px] font-semibold leading-none">
                  {user.contestRating}
                </p>
                <p className="mt-1.5 text-[12.5px] text-white/75">Rating</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-7">

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
        <Module className="mb-4">
          <div className="flex flex-col gap-2.5 p-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                strokeWidth={1.75}
                aria-hidden
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search problems by title"
                aria-label="Search problems by title"
                className="h-8 pl-8 pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
              <NativeSelect
                value={filters.status}
                onChange={(e) => updateFilters({ status: e.target.value })}
                aria-label="Filter by status"
                className="lg:w-36"
              >
                <option value="all">All problems</option>
                <option value="solved">Solved only</option>
              </NativeSelect>

              <NativeSelect
                value={filters.difficulty}
                onChange={(e) => updateFilters({ difficulty: e.target.value })}
                aria-label="Filter by difficulty"
                className="lg:w-48"
              >
                {DIFFICULTIES.map((d) => {
                  const label = d === 'all' ? 'All difficulties' : difficultyMeta(d).label;
                  const count = d === 'all' ? grandTotal : categoryCounts.difficulty?.[d] || 0;
                  return <option key={d} value={d}>{label} ({count})</option>;
                })}
              </NativeSelect>

              <NativeSelect
                value={filters.tag}
                onChange={(e) => updateFilters({ tag: e.target.value })}
                aria-label="Filter by topic"
                className="col-span-2 sm:col-span-1 lg:w-44"
              >
                {TAGS.map((t) => {
                  const count = t.value === 'all' ? grandTotal : categoryCounts.tags?.[t.value] || 0;
                  return <option key={t.value} value={t.value}>{t.label} ({count})</option>;
                })}
              </NativeSelect>
            </div>
          </div>
        </Module>

        <Module ticks>
          <ModuleHead
            label="Problems"
            right={
              <span className="t-data text-ink-3">
                {loading ? '——' : `${totalProblems} listed`}
              </span>
            }
          />

          {loading ? (
            <Plotter label="Reading index" />
          ) : problems.length === 0 ? (
            <EmptySheet
              title="No problem matches this filter"
              detail={
                filtersActive
                  ? 'Widen the search, or clear the filters to see the whole set.'
                  : 'The set is empty. Once problems are published they will be listed here.'
              }
              action={
                filtersActive ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSearchInput('');
                      updateFilters({ difficulty: 'all', tag: 'all', status: 'all', search: '' });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <ProblemTable
              problems={problems}
              solvedIds={solvedIds}
              sorting={sorting}
              onSortingChange={handleSortingChange}
            />
          )}

          {!loading && totalPages > 1 && (
            <>
              <Rule />
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <Button
                  size="sm"
                  tone="quiet"
                  disabled={page <= 1}
                  onClick={() => setSearchParams({ page: String(Math.max(page - 1, 1)) })}
                >
                  <ChevronLeft className="h-3 w-3" strokeWidth={2} />
                  Prev
                </Button>
                <span className="t-data text-ink-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  tone="quiet"
                  disabled={page >= totalPages}
                  onClick={() => setSearchParams({ page: String(Math.min(page + 1, totalPages)) })}
                >
                  Next
                  <ChevronRight className="h-3 w-3" strokeWidth={2} />
                </Button>
              </div>
            </>
          )}
        </Module>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-[72px]">
            <Module>
              <ModuleHead label="Browse by topic" />
              <div className="flex flex-wrap gap-1.5 p-3.5">
                {TAGS.filter((t) => t.value !== 'all').map((t) => {
                  const count = categoryCounts.tags?.[t.value] || 0;
                  const active = filters.tag === t.value;
                  const hue = topicHue(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateFilters({ tag: active ? 'all' : t.value })}
                      aria-pressed={active}
                      className={cn(
                        't-micro rounded-full border px-2.5 py-1 transition-colors',
                        active ? 'font-bold' : 'hover:bg-soft-hover'
                      )}
                      style={{
                        color: hue,
                        borderColor: active
                          ? hue
                          : `color-mix(in srgb, ${hue} 34%, transparent)`,
                        background: active
                          ? `color-mix(in srgb, ${hue} 18%, transparent)`
                          : 'transparent',
                      }}
                    >
                      {t.label}
                      <span className="ml-1.5 opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </Module>

            {daily?.problem && (
              <Module ticks>
                <ModuleHead
                  label="Today’s challenge"
                  right={
                    daily.solvedInWindowByMe ? (
                      <span className="t-micro flex items-center gap-1 text-approved">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        Solved
                      </span>
                    ) : (
                      <span className="t-micro flex items-center gap-1 text-caution">
                        <Flame className="h-3 w-3" strokeWidth={2.2} />
                        {user?.dailyStreak ?? 0}d streak
                      </span>
                    )
                  }
                />
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-1.5">
                    <DifficultyMark difficulty={daily.problem.difficulty} />
                    <p className="t-h3 text-ink">{daily.problem.title}</p>
                  </div>
                  <p className="t-body-sm text-ink-3">
                    {daily.solvedInWindowByMe
                      ? 'Done for today — your streak is safe.'
                      : 'Solve it inside the window to earn credits and hold your streak.'}
                  </p>
                  <Button
                    size="sm"
                    tone={daily.solvedInWindowByMe ? 'outline' : 'line'}
                    asChild
                  >
                    <NavLink to={`/problem/${daily.problem._id}`}>
                      {daily.solvedInWindowByMe ? 'Open problem' : 'Solve now'}
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </NavLink>
                  </Button>
                </div>
              </Module>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent
          title="Credit schedule"
          description={`You hold ${(user?.credits ?? 0).toLocaleString()} credits. Credits cannot be bought — only earned.`}
        >
          <ul className="flex flex-col">
            {CREDIT_CRITERIA.map((c, i) => (
              <li
                key={c.label}
                className={cn(
                  'flex items-start gap-3 py-2.5',
                  i > 0 && 'border-t border-rule-faint'
                )}
              >
                <span className="t-data-lg w-16 shrink-0 pt-px text-right font-semibold text-approved">
                  {c.credits}
                </span>
                <div className="min-w-0">
                  <p className="t-body font-semibold text-ink">{c.label}</p>
                  <p className="t-body-sm mt-0.5 text-ink-2">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default Homepage;
