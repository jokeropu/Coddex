import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Flame, Coins, Check, ArrowRight } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import { cn, problemNo, difficultyMeta } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, DifficultyMark,
  Plotter, EmptySheet, Stamp,
} from '../design/primitives';

const WindowClock = ({ windowEnd, expired }) => {
  const [left, setLeft] = useState(() => new Date(windowEnd).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(windowEnd).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [windowEnd]);

  if (!windowEnd) return null;

  if (left <= 0) {
    return (
      <div className="flex flex-col">
        <span className="t-micro text-ink-3">Window</span>
        <span className="t-data-lg font-semibold text-ink-3">Closed</span>
      </div>
    );
  }

  const total = Math.floor(left / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const urgent = !expired && total < 3600;

  return (
    <div className="flex flex-col">
      <span className="t-micro text-ink-3">Window closes in</span>
      <span
        className="t-data-lg font-semibold"
        style={{ color: urgent ? 'var(--c-redline)' : 'var(--c-ink)' }}
      >
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
};

function DailyChallenge() {
  const [today, setToday] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const previousTodayRef = useRef(null);

  const fetchToday = async () => {
    try {
      const { data } = await axiosClient.get('/daily-challenge/today');
      const previous = previousTodayRef.current;
      if (previous && !previous.solvedInWindowByMe && data.solvedInWindowByMe) {
        toast.success('Daily challenge solved', {
          description: `Credits awarded. Streak now ${data.myStreak} day${data.myStreak === 1 ? '' : 's'}.`,
        });
      }
      previousTodayRef.current = data;
      setToday(data);
    } catch (error) {
      console.error("Error fetching today's daily challenge:", error);
    }
  };

  const fetchCalendar = async () => {
    try {
      const { data } = await axiosClient.get('/daily-challenge/calendar');
      setCalendar(data);
    } catch (error) {
      console.error('Error fetching daily challenge calendar:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchToday(), fetchCalendar()]);
      setLoading(false);
    };
    load();

    const onFocus = () => { fetchToday(); fetchCalendar(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);

  }, []);

  if (loading) {
    return (
      <AppShell>
        <PageBody><Plotter label="Loading today’s problem" /></PageBody>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title="Daily Challenge"
          detail="One featured problem a day. Solve it inside the window to earn credits and hold your streak — miss it and the streak resets to zero."
        />

        {!today ? (
          <Module ticks>
            <EmptySheet
              title="No challenge issued today"
              detail="Today’s featured problem hasn’t been published yet. Check back shortly."
            />
          </Module>
        ) : (
          <Module ticks className="mb-6">
            <ModuleHead
              label="Today’s problem"
              right={<span className="t-data text-ink-3">{today.date}</span>}
            />

            <div className="flex flex-col gap-5 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <span className="t-data text-ink-3">{problemNo(today.problem.problemNumber)}</span>
                  <DifficultyMark difficulty={today.problem.difficulty} />
                </div>
                <h2 className="t-h2 text-ink">{today.problem.title}</h2>

                {today.solvedInWindowByMe && (
                  <div className="mt-3">
                    <Stamp verdict="approved" label="Solved" sub="Credited today" />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-stretch gap-0 border border-rule">
                <div className="flex items-center gap-2 border-r border-rule px-3 py-2">
                  <Flame className="h-3.5 w-3.5 text-caution" strokeWidth={1.75} aria-hidden />
                  <span className="flex flex-col">
                    <span className="t-micro text-ink-3">Streak</span>
                    <span className="t-data-lg font-semibold text-ink">{today.myStreak}d</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 border-r border-rule px-3 py-2">
                  <Coins className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.75} aria-hidden />
                  <span className="flex flex-col">
                    <span className="t-micro text-ink-3">Credits</span>
                    <span className="t-data-lg font-semibold text-ink">
                      {(today.myCredits ?? 0).toLocaleString()}
                    </span>
                  </span>
                </div>
                <div className="flex items-center px-3 py-2">
                  <WindowClock windowEnd={today.windowEnd} expired={today.solvedInWindowByMe} />
                </div>
              </div>
            </div>

            <div className="border-t border-rule bg-sheet-sunk px-4 py-2.5">
              <Button tone={today.solvedInWindowByMe ? 'outline' : 'line'} size="md" asChild>
                <Link to={`/problem/${today.problem._id}`}>
                  {today.solvedInWindowByMe ? 'Open problem' : 'Solve now'}
                  <ArrowRight className="h-3 w-3" strokeWidth={2} />
                </Link>
              </Button>
            </div>
          </Module>
        )}

        <Module ticks>
          <ModuleHead
            label="Last 30 days"
            right={
              <span className="t-data text-ink-3">
                {calendar.filter((d) => d.wasSolvedByMeInWindow).length}/{calendar.length} solved
              </span>
            }
          />

          {calendar.length === 0 ? (
            <EmptySheet title="No history yet" detail="Past daily challenges will be logged here." />
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {calendar.map((day, i) => {
                const meta = difficultyMeta(day.problem.difficulty);
                return (
                  <li
                    key={day.date}
                    className={cn(
                      'border-rule-faint',
                      'border-b border-r',
                      (i + 1) % 2 === 0 && 'sm:border-r',
                      'last:border-r-0'
                    )}
                  >
                    <Link
                      to={`/problem/${day.problem._id}`}
                      className="group flex h-full flex-col gap-1.5 p-3 transition-colors hover:bg-sheet-hover"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="t-data text-ink-3">{day.date}</span>
                        {day.wasSolvedByMeInWindow ? (
                          <span
                            className="flex h-3.5 w-3.5 items-center justify-center border border-approved bg-approved/15"
                            title="Solved in window"
                          >
                            <Check className="h-2 w-2 text-approved" strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className="h-3.5 w-3.5 border border-rule" aria-hidden />
                        )}
                      </div>
                      <p className="t-body-sm line-clamp-2 font-medium text-ink group-hover:text-line">
                        {day.problem.title}
                      </p>
                      <span className="t-micro mt-auto" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Module>
      </PageBody>
    </AppShell>
  );
}

export default DailyChallenge;
