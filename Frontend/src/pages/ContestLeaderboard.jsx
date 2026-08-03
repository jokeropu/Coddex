import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useSelector } from 'react-redux';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { cn } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Note, Plotter, EmptySheet,
} from '../design/primitives';

function ContestLeaderboard() {
  const { contestId } = useParams();
  const [leaderboard, setLeaderboard] = useState(null);
  const [wasRated, setWasRated] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: me } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get(`/contest/${contestId}/leaderboard`);
        setLeaderboard(data.leaderboard);
        setWasRated(data.wasRated);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load these standings.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [contestId]);

  const GRID = wasRated
    ? 'grid-cols-[52px_1fr_72px_112px]'
    : 'grid-cols-[52px_1fr_72px]';

  return (
    <AppShell>
      <PageBody width="max-w-3xl">
        <PageHeader
          title="Standings"
          detail="Final ranking for this contest. Placing in the top 20 earns credits, provided you submitted at least once."
          actions={
            <>
              <Button size="sm" asChild>
                <Link to={`/contest/${contestId}`}>Practice this set</Link>
              </Button>
              <Button size="sm" tone="quiet" asChild>
                <Link to="/contests">All contests</Link>
              </Button>
            </>
          }
        />

        {loading ? (
          <Module><Plotter label="Resolving standings" /></Module>
        ) : error ? (
          <Note tone="caution">{error}</Note>
        ) : (
          <>
            {!wasRated && (
              <Note tone="caution" title="UNRATED" className="mb-3">
                Too few participants entered for this contest to move anyone’s rating.
              </Note>
            )}

            <Module ticks>
              <ModuleHead
                label="Final ranking"
                right={<span className="t-data text-ink-3">{leaderboard?.length ?? 0} entrants</span>}
              />

              <div className={cn('grid items-center gap-x-3 border-b border-rule bg-sheet-sunk px-3 py-1.5', GRID)}>
                <span className="t-micro text-ink-3">Rank</span>
                <span className="t-micro text-ink-3">User</span>
                <span className="t-micro text-right text-ink-3">Score</span>
                {wasRated && <span className="t-micro text-right text-ink-3">Rating</span>}
              </div>

              {!leaderboard || leaderboard.length === 0 ? (
                <EmptySheet
                  title="No entrants"
                  detail="Nobody submitted to this contest before it closed."
                />
              ) : (
                <ul>
                  {leaderboard.map((entry) => {
                    const isMe = me?._id === entry.userId;
                    return (
                      <li
                        key={entry.userId}
                        className={cn(
                          'grid items-center gap-x-3 border-b border-rule-faint px-3 py-2 last:border-b-0',
                          isMe && 'bg-[color-mix(in_srgb,var(--c-line)_9%,transparent)]',
                          GRID
                        )}
                      >
                        <span
                          className={cn(
                            't-data font-semibold',
                            entry.rank <= 3 ? 'text-caution' : 'text-ink-3'
                          )}
                        >
                          {String(entry.rank).padStart(2, '0')}
                        </span>
                        <span className="t-body min-w-0 truncate text-ink">
                          {entry.firstName} {entry.lastName || ''}
                          {isMe && <span className="t-micro ml-2 text-line">You</span>}
                        </span>
                        <span className="t-data-lg text-right font-semibold text-ink">
                          {entry.totalScore}
                        </span>
                        {wasRated && (
                          <span className="flex items-baseline justify-end gap-1.5">
                            <span className="t-data text-ink-2">{entry.ratingAfter}</span>
                            <span
                              className="t-data font-semibold"
                              style={{
                                color: entry.ratingDelta >= 0 ? 'var(--c-approved)' : 'var(--c-redline)',
                              }}
                            >
                              {entry.ratingDelta >= 0 ? '+' : ''}{entry.ratingDelta}
                            </span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Module>
          </>
        )}
      </PageBody>
    </AppShell>
  );
}

export default ContestLeaderboard;
