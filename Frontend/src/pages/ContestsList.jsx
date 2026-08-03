import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Pencil, Trophy, ArrowRight } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { cn } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Chip, Plotter, EmptySheet,
} from '../design/primitives';

const STATUS = {
  upcoming: { label: 'Upcoming', tone: 'var(--c-line)' },
  live:     { label: 'Live',     tone: 'var(--c-approved)' },
  ended:    { label: 'Ended',    tone: 'var(--c-ink-3)' },
};

const formatWindow = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
  return `${s.toLocaleString(undefined, opts)} → ${e.toLocaleString(undefined, opts)}`;
};

const Countdown = ({ to, prefix }) => {
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (left <= 0) return null;

  const total = Math.floor(left / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className="t-data text-ink-2">
      {prefix} <span className="font-semibold text-ink">
        {d > 0 ? `${d}d ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </span>
  );
};

function ContestsList() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const { data } = await axiosClient.get('/contest');
        setContests(data);
      } catch (error) {
        console.error('Error fetching contests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContests();
  }, []);

  const live = contests.filter((c) => c.status === 'live');
  const upcoming = contests.filter((c) => c.status === 'upcoming');
  const ended = contests.filter((c) => c.status === 'ended');

  const Row = ({ contest }) => {
    const meta = STATUS[contest.status] || STATUS.ended;
    return (
      <li className="border-b border-rule-faint last:border-b-0">
        <div className="flex flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-body truncate font-semibold text-ink">{contest.title}</h3>
              <Chip tone={meta.tone} dot>{meta.label}</Chip>
            </div>
            {contest.description && (
              <p className="t-body-sm mt-0.5 line-clamp-1 text-ink-2">{contest.description}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="t-data text-ink-3">{formatWindow(contest.startTime, contest.endTime)}</span>
              {contest.status === 'live' && <Countdown to={contest.endTime} prefix="Closes in" />}
              {contest.status === 'upcoming' && <Countdown to={contest.startTime} prefix="Opens in" />}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {contest.status === 'ended' ? (
              <>
                <Button size="sm" asChild>
                  <Link to={`/contest/${contest._id}`}>Practice</Link>
                </Button>
                <Button size="sm" tone="line" asChild>
                  <Link to={`/contest/${contest._id}/leaderboard`}>
                    <Trophy className="h-3 w-3" strokeWidth={1.75} />
                    Standings
                  </Link>
                </Button>
              </>
            ) : (
              <>
                {contest.isCreator && contest.status === 'upcoming' && (
                  <Button size="sm" asChild>
                    <Link to={`/admin/contest/edit/${contest._id}`}>
                      <Pencil className="h-3 w-3" strokeWidth={1.75} />
                      Edit
                    </Link>
                  </Button>
                )}
                <Button size="sm" tone={contest.status === 'live' ? 'approved' : 'line'} asChild>
                  <Link to={`/contest/${contest._id}`}>
                    {contest.status === 'live' ? 'Enter' : 'View'}
                    <ArrowRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </li>
    );
  };

  const Section = ({ label, items, count }) =>
    items.length === 0 ? null : (
      <Module ticks className="mb-4">
        <ModuleHead label={label} right={<span className="t-data text-ink-3">{count}</span>} />
        <ul>{items.map((c) => <Row key={c._id} contest={c} />)}</ul>
      </Module>
    );

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title="Contests"
          detail="Timed problem sets. Enter one, submit under the clock, and the standings resolve when it closes — placing earns credits."
        />

        {loading ? (
          <Module><Plotter label="Loading contests" /></Module>
        ) : contests.length === 0 ? (
          <Module ticks>
            <EmptySheet
              title="No contests issued"
              detail="When a contest is scheduled it will appear here with its opening time."
            />
          </Module>
        ) : (
          <>
            <Section label="Live now" items={live} count={live.length} />
            <Section label="Upcoming" items={upcoming} count={upcoming.length} />
            <Section label="Archive" items={ended} count={ended.length} />
          </>
        )}
      </PageBody>
    </AppShell>
  );
}

export default ContestsList;
