import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { cn, difficultyMeta } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Chip, Note, Plotter, EmptySheet,
} from '../design/primitives';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KEYS = ['easy', 'medium', 'hard'];

const STATUS_TONE = {
  upcoming: 'var(--c-line)',
  live: 'var(--c-approved)',
  ended: 'var(--c-ink-3)',
};

const CompletionScales = ({ difficulty, totalSolved, totalProblems }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-ink">
        {totalSolved}
      </span>
      <span className="t-data-lg text-ink-3">/ {totalProblems} problems solved</span>
    </div>

    <div className="flex flex-col gap-2">
      {KEYS.map((key) => {
        const meta = difficultyMeta(key);
        const { solved, total } = difficulty[key];
        const pct = total > 0 ? (solved / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span className="t-micro w-12 shrink-0" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <div className="h-2 min-w-0 flex-1 border border-rule bg-sheet-sunk">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
            <span className="t-data w-16 shrink-0 text-right text-ink-2">
              {solved}<span className="text-ink-3">/{total}</span>
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const buildWeeks = (days) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 370);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks = [];
  const cursor = new Date(start);
  let prevMonth = -1;

  while (cursor <= today) {
    const week = [];
    let monthLabel = null;
    for (let d = 0; d < 7; d++) {
      if (cursor > today) {
        week.push(null);
      } else {
        const key = cursor.toISOString().slice(0, 10);
        const month = cursor.getUTCMonth();
        if (d === 0 && month !== prevMonth) {
          monthLabel = MONTH_NAMES[month];
          prevMonth = month;
        }
        week.push({ key, count: days[key] || 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    weeks.push({ days: week, monthLabel });
  }
  return weeks;
};

const heatStyle = (count) => {
  if (!count) return { background: 'var(--c-sheet-sunk)', borderColor: 'var(--c-rule-faint)' };
  const step = count === 1 ? 0.3 : count <= 3 ? 0.52 : count <= 6 ? 0.76 : 1;
  return {
    background: `color-mix(in srgb, var(--c-line) ${step * 100}%, transparent)`,
    borderColor: `color-mix(in srgb, var(--c-line) ${Math.min(step + 0.2, 1) * 100}%, transparent)`,
  };
};

const ActivityLog = ({ activity }) => {
  const weeks = useMemo(() => buildWeeks(activity.days), [activity.days]);

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <p className="t-body text-ink">
          <span className="t-data-lg font-semibold">{activity.totalSubmissionsPastYear}</span>
          <span className="text-ink-2"> submissions in the past year</span>
        </p>
        <div className="flex items-center gap-4">
          <span className="t-body-sm text-ink-2">
            Active days <span className="t-data font-semibold text-ink">{activity.totalActiveDays}</span>
          </span>
          <span className="t-body-sm text-ink-2">
            Max streak <span className="t-data font-semibold text-ink">{activity.maxStreak}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div className="t-micro h-3.5 leading-[14px] text-ink-3">{week.monthLabel || ''}</div>
              {week.days.map((day, di) =>
                day ? (
                  <div
                    key={di}
                    title={`${day.count} submission${day.count !== 1 ? 's' : ''} on ${day.key}`}
                    className="h-[11px] w-[11px] border"
                    style={heatStyle(day.count)}
                  />
                ) : (
                  <div key={di} className="h-[11px] w-[11px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="t-micro text-ink-3">Less</span>
        {[0, 1, 3, 6, 9].map((c) => (
          <span key={c} className="h-[11px] w-[11px] border" style={heatStyle(c)} />
        ))}
        <span className="t-micro text-ink-3">More</span>
      </div>
    </div>
  );
};

const RatingPlot = ({ contests }) => {
  const points = [...contests].reverse().filter((c) => typeof c.ratingAfter === 'number');
  if (points.length < 2) return null;

  const W = 640;
  const H = 150;
  const PAD = { t: 10, r: 8, b: 8, l: 34 };

  const values = points.map((p) => p.ratingAfter);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const x = (i) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.ratingAfter).toFixed(1)}`).join(' ');
  const ticks = [max, min];
  const shortDate = (d) =>
    new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

  return (
    <div className="p-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Contest rating across ${points.length} contests, from ${values[0]} on ${shortDate(points[0].startTime)} to ${values[values.length - 1]} on ${shortDate(points[points.length - 1].startTime)}`}
        >
          {ticks.map((t) => (
            <line
              key={t}
              x1={PAD.l}
              y1={y(t)}
              x2={W - PAD.r}
              y2={y(t)}
              stroke="var(--c-rule-faint)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={path}
            fill="none"
            stroke="var(--c-line)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <rect
              key={p.contestId}
              x={x(i) - 2}
              y={y(p.ratingAfter) - 2}
              width="4"
              height="4"
              fill={p.ratingDelta >= 0 ? 'var(--c-approved)' : 'var(--c-redline)'}
            />
          ))}
        </svg>

        {ticks.map((t) => (
          <span
            key={t}
            className="t-data pointer-events-none absolute left-0 -translate-y-1/2 bg-sheet-raised pr-1 leading-none text-ink-3"
            style={{ top: `${(y(t) / H) * 100}%` }}
            aria-hidden
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-1 flex items-baseline justify-between border-t border-rule-faint pt-1.5">
        <span className="t-micro text-ink-3">{shortDate(points[0].startTime)}</span>
        <span className="t-micro text-ink-3">
          {points.length} contests
        </span>
        <span className="t-micro text-ink-3">{shortDate(points[points.length - 1].startTime)}</span>
      </div>
    </div>
  );
};

const ContestHistory = ({ contests }) => {
  if (contests.length === 0) {
    return <EmptySheet title="No contests entered" detail="Contest results and rating changes appear here once you enter one." />;
  }
  const GRID = 'grid-cols-[minmax(0,1fr)_46px_94px] md:grid-cols-[minmax(0,1fr)_96px_56px_66px_110px]';
  return (
    <>
      <div className={cn('grid items-center gap-x-3 border-b border-rule bg-sheet-sunk px-3 py-1.5', GRID)}>
        <span className="t-micro text-ink-3">Contest</span>
        <span className="t-micro hidden text-ink-3 md:block">Date</span>
        <span className="t-micro text-right text-ink-3">Rank</span>
        <span className="t-micro hidden text-right text-ink-3 md:block">Points</span>
        <span className="t-micro text-right text-ink-3">Rating</span>
      </div>
      <ul>
        {contests.map((c) => (
          <li key={c.contestId} className={cn('grid items-center gap-x-3 border-b border-rule-faint px-3 py-2 last:border-b-0', GRID)}>
            <span className="t-body min-w-0 truncate font-medium text-ink">{c.title}</span>
            <span className="t-data hidden text-ink-3 md:block">
              {new Date(c.startTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })}
            </span>
            <span className="t-data text-right text-ink-2">{c.rank ?? '—'}</span>
            <span className="t-data hidden text-right text-ink-2 md:block">{c.totalScore}</span>
            <span className="flex items-baseline justify-end gap-1.5">
              <span className="t-data text-ink-2">{c.ratingAfter}</span>
              <span
                className="t-data font-semibold"
                style={{ color: c.ratingDelta >= 0 ? 'var(--c-approved)' : 'var(--c-redline)' }}
              >
                {c.ratingDelta >= 0 ? '+' : ''}{c.ratingDelta}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
};

const CreatedContestsHistory = ({ contests }) => {
  if (contests.length === 0) {
    return <EmptySheet title="None created" detail="Contests you author will be listed here." />;
  }
  const GRID = 'grid-cols-[minmax(0,1fr)_76px_58px] md:grid-cols-[minmax(0,1fr)_96px_78px_74px]';
  return (
    <>
      <div className={cn('grid items-center gap-x-3 border-b border-rule bg-sheet-sunk px-3 py-1.5', GRID)}>
        <span className="t-micro text-ink-3">Contest</span>
        <span className="t-micro hidden text-ink-3 md:block">Date</span>
        <span className="t-micro text-ink-3">Status</span>
        <span className="t-micro text-right text-ink-3">Entrants</span>
      </div>
      <ul>
        {contests.map((c) => (
          <li key={c.contestId} className={cn('grid items-center gap-x-3 border-b border-rule-faint px-3 py-2 last:border-b-0', GRID)}>
            <span className="t-body min-w-0 truncate font-medium text-ink">{c.title}</span>
            <span className="t-data hidden text-ink-3 md:block">
              {new Date(c.startTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })}
            </span>
            <span><Chip tone={STATUS_TONE[c.status]} dot>{c.status}</Chip></span>
            <span className="t-data text-right text-ink-2">{c.participantCount}</span>
          </li>
        ))}
      </ul>
    </>
  );
};

const Progress = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data } = await axiosClient.get('/progress');
        setData(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your progress. Refresh to try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return <AppShell><PageBody><Plotter label="Loading progress" /></PageBody></AppShell>;
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <Note tone="redline">{error || 'Something went wrong loading your progress.'}</Note>
        </PageBody>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title="Progress"
          detail="What you have solved, how consistently you have turned up, and how contests moved your rating."
        />

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Module ticks>
            <ModuleHead label="Set completion" />
            <div className="p-4">
              <CompletionScales
                difficulty={data.difficulty}
                totalSolved={data.totalSolved}
                totalProblems={data.totalProblems}
              />
            </div>
          </Module>

          <Module ticks>
            <ModuleHead
              label="Contest rating"
              right={<span className="t-data text-ink-3">{user?.contestRating ?? '—'}</span>}
            />
            {data.contests.length < 2 ? (
              <EmptySheet
                title="Not enough contests plotted"
                detail="Enter at least two rated contests to see your rating curve."
                className="py-10"
              />
            ) : (
              <RatingPlot contests={data.contests} />
            )}
          </Module>
        </div>

        <Module ticks className="mb-4">
          <ModuleHead label="Activity log" />
          <ActivityLog activity={data.activity} />
        </Module>

        <Module ticks className="mb-4">
          <ModuleHead
            label="Contest history"
            right={<span className="t-data text-ink-3">{data.contests.length}</span>}
          />
          <ContestHistory contests={data.contests} />
        </Module>

        {user?.role === 'admin' && (
          <Module ticks>
            <ModuleHead
              label="Contests created"
              right={<span className="t-data text-ink-3">{(data.createdContests || []).length}</span>}
            />
            <CreatedContestsHistory contests={data.createdContests || []} />
          </Module>
        )}
      </PageBody>
    </AppShell>
  );
};

export default Progress;
