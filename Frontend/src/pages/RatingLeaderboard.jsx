import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { cn } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Plotter, EmptySheet, Rule,
} from '../design/primitives';

const GRID = 'grid-cols-[52px_1fr_88px]';

function RatingLeaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { user: me } = useSelector((state) => state.auth);

  useEffect(() => {
    let ignore = false;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get('/contest/rating-leaderboard', { params: { page } });
        if (ignore) return;
        setUsers(data.users);
        setTotalPages(data.totalPages);
      } catch (error) {
        if (!ignore) console.error('Error fetching rating leaderboard:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => { ignore = true; };
  }, [page]);

  return (
    <AppShell>
      <PageBody width="max-w-xl">
        <PageHeader
          title="Rating"
          detail="Ranked by contest rating across every contest. Rating moves only when a contest you entered resolves."
        />

        <Module ticks>
          <ModuleHead label="Standings" />

          <div className={cn('grid items-center gap-x-3 border-b border-rule bg-sheet-sunk px-3 py-1.5', GRID)}>
            <span className="t-micro text-ink-3">Rank</span>
            <span className="t-micro text-ink-3">User</span>
            <span className="t-micro text-right text-ink-3">Rating</span>
          </div>

          {loading ? (
            <Plotter label="Loading standings" />
          ) : users.length === 0 ? (
            <EmptySheet
              title="No rated users yet"
              detail="Ratings appear once contests have run and resolved."
            />
          ) : (
            <ul>
              {users.map((u, index) => {
                const rank = (page - 1) * 10 + index + 1;
                const isMe = me?._id === u._id;
                return (
                  <li
                    key={u._id}
                    className={cn(
                      'grid items-center gap-x-3 border-b border-rule-faint px-3 py-2 last:border-b-0',
                      isMe && 'bg-[color-mix(in_srgb,var(--c-line)_9%,transparent)]',
                      GRID
                    )}
                  >
                    <span
                      className={cn(
                        't-data font-semibold',
                        rank <= 3 ? 'text-caution' : 'text-ink-3'
                      )}
                    >
                      {String(rank).padStart(2, '0')}
                    </span>
                    <span className="t-body min-w-0 truncate text-ink">
                      {u.firstName} {u.lastName || ''}
                      {isMe && <span className="t-micro ml-2 text-line">You</span>}
                    </span>
                    <span className="t-data-lg text-right font-semibold text-ink">
                      {u.contestRating}
                    </span>
                  </li>
                );
              })}
            </ul>
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
                <span className="t-data text-ink-3">Page {page} of {totalPages}</span>
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
      </PageBody>
    </AppShell>
  );
}

export default RatingLeaderboard;
