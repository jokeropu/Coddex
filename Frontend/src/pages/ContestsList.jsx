import { useEffect, useState, useCallback, useRef } from 'react';
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

const DATE_OPTS = { weekday: 'short', day: '2-digit', month: 'short' };
const TIME_OPTS = { hour: '2-digit', minute: '2-digit' };

const formatDay = (d) => new Date(d).toLocaleDateString(undefined, DATE_OPTS);
const formatTime = (d) => new Date(d).toLocaleTimeString(undefined, TIME_OPTS);
const formatSpan = (start, end) =>
  `${formatDay(start)} · ${formatTime(start)} – ${formatTime(end)}`;

const durationMins = (start, end) =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

const useCountdown = (to) => {
  const [left, setLeft] = useState(() => new Date(to).getTime() - Date.now());

  useEffect(() => {
    setLeft(new Date(to).getTime() - Date.now());
    const id = setInterval(() => setLeft(new Date(to).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [to]);

  return left;
};

const splitParts = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
};

const pad = (n) => String(n).padStart(2, '0');

const Clock = ({ to, label, tone, size = 'lead', onExpire }) => {
  const left = useCountdown(to);
  const expired = left <= 0;
  const startedExpired = useRef(expired);
  const fired = useRef(false);

  useEffect(() => {
    if (!expired || startedExpired.current || fired.current) return;
    fired.current = true;
    onExpire?.();
  }, [expired, onExpire]);

  if (expired) return null;

  const { d, h, m, s } = splitParts(left);
  const isLead = size === 'lead';

  return (
    <div className="flex flex-col gap-1">
      <span className="t-micro text-ink-3">{label}</span>
      <span
        className={cn('tabular-nums leading-none', isLead ? 't-h2' : 't-data-lg')}
        style={{ color: tone, fontFamily: 'var(--font-mono)' }}
        aria-hidden
      >
        {d > 0 && <>{d}<span className="text-ink-3">d</span> </>}
        {pad(h)}<span className="text-ink-3">:</span>{pad(m)}
        <span className="text-ink-3">:</span>{pad(s)}
      </span>
      <span className="sr-only">{`${label} ${formatDay(to)} at ${formatTime(to)}`}</span>
    </div>
  );
};

const Actions = ({ contest, size = 'sm' }) => {
  if (contest.status === 'ended') {
    return (
      <>
        <Button size={size} asChild>
          <Link to={`/contest/${contest._id}`}>Practice</Link>
        </Button>
        <Button size={size} tone="line" asChild>
          <Link to={`/contest/${contest._id}/leaderboard`}>
            <Trophy className="h-3 w-3" strokeWidth={1.75} />
            Standings
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      {contest.isCreator && contest.status === 'upcoming' && (
        <Button size={size} asChild>
          <Link to={`/admin/contest/edit/${contest._id}`}>
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            Edit
          </Link>
        </Button>
      )}
      <Button size={size} tone={contest.status === 'live' ? 'approved' : 'line'} asChild>
        <Link to={`/contest/${contest._id}`}>
          {contest.status === 'live' ? 'Enter' : 'View'}
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </Button>
    </>
  );
};

const Lead = ({ contest, onExpire }) => {
  const meta = STATUS[contest.status];
  const isLive = contest.status === 'live';

  return (
    <Module ticks className="mb-8">
      <ModuleHead
        label={isLive ? 'Running now' : 'Next contest'}
        right={<Chip tone={meta.tone} dot>{meta.label}</Chip>}
      />

      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start md:justify-between md:gap-10 md:p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="t-h2 text-ink">{contest.title}</h2>
          {contest.description && (
            <p className="t-body max-w-prose text-ink-2">{contest.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="t-data text-ink-3">{formatSpan(contest.startTime, contest.endTime)}</span>
            <span className="h-3 w-px bg-rule" aria-hidden />
            <span className="t-data text-ink-3">
              {durationMins(contest.startTime, contest.endTime)} min
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-5 md:items-end">
          <Clock
            to={isLive ? contest.endTime : contest.startTime}
            label={isLive ? 'Closes in' : 'Opens in'}
            tone={isLive ? 'var(--c-approved)' : 'var(--c-line)'}
            onExpire={onExpire}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Actions contest={contest} size="md" />
          </div>
        </div>
      </div>
    </Module>
  );
};

const Row = ({ contest, onExpire }) => {
  const meta = STATUS[contest.status] || STATUS.ended;
  const isUpcoming = contest.status === 'upcoming';

  return (
    <li className="border-b border-rule-faint last:border-b-0">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="t-body truncate font-semibold text-ink">{contest.title}</h3>
            <Chip tone={meta.tone} dot>{meta.label}</Chip>
          </div>
          {contest.description && (
            <p className="t-body-sm line-clamp-1 text-ink-3">{contest.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-6 lg:w-64 lg:justify-end">
          <div className="flex flex-col gap-0.5">
            <span className="t-data text-ink-2">{formatDay(contest.startTime)}</span>
            <span className="t-data text-ink-3">
              {formatTime(contest.startTime)} · {durationMins(contest.startTime, contest.endTime)} min
            </span>
          </div>
          {isUpcoming && (
            <Clock
              to={contest.startTime}
              label="Opens in"
              tone="var(--c-line)"
              size="row"
              onExpire={onExpire}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:w-44 lg:justify-end">
          <Actions contest={contest} />
        </div>
      </div>
    </li>
  );
};

const Section = ({ label, items, onExpire }) =>
  items.length === 0 ? null : (
    <Module ticks className="mb-8 last:mb-0">
      <ModuleHead label={label} right={<span className="t-data text-ink-3">{items.length}</span>} />
      <ul>
        {items.map((c) => <Row key={c._id} contest={c} onExpire={onExpire} />)}
      </ul>
    </Module>
  );

function ContestsList() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContests = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/contest');
      setContests(data);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContests(); }, [fetchContests]);

  const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime);

  const live = contests
    .filter((c) => c.status === 'live')
    .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
  const upcoming = contests.filter((c) => c.status === 'upcoming').sort(byStart);
  const ended = contests.filter((c) => c.status === 'ended').sort((a, b) => byStart(b, a));

  const lead = live[0] ?? upcoming[0] ?? null;
  const restLive = live.filter((c) => c !== lead);
  const restUpcoming = upcoming.filter((c) => c !== lead);

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
              title="No contests scheduled"
              detail="When a contest is scheduled it will appear here with the time it opens."
            />
          </Module>
        ) : (
          <>
            {lead && <Lead contest={lead} onExpire={fetchContests} />}
            <Section label="Running now" items={restLive} onExpire={fetchContests} />
            <Section label="Scheduled" items={restUpcoming} onExpire={fetchContests} />
            <Section label="Archive" items={ended} onExpire={fetchContests} />
          </>
        )}
      </PageBody>
    </AppShell>
  );
}

export default ContestsList;
