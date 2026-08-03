import { useEffect, useState } from 'react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { cn, problemNo, difficultyMeta } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Chip, DifficultyMark,
  Note, Plotter, EmptySheet, Input,
} from '../design/primitives';

const GRID_MD = 'md:grid-cols-[84px_minmax(0,1fr)_92px_140px_auto]';

export default function AdminProblemTable({
  title,
  detail,
  moduleLabel,
  renderActions,
  emptyTitle = 'No problems yet',
  emptyDetail = 'Once problems are published they will be listed here.',
  banner,
}) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const { data } = await axiosClient.get('/problem/getAllProblem');
        setProblems(Array.isArray(data) ? data : data?.problems || []);
        setError(null);
      } catch (err) {
        setError('Could not load problems. Refresh to try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  const removeLocally = (id) => setProblems((prev) => prev.filter((p) => p._id !== id));

  const filtered = query.trim()
    ? problems.filter((p) => p.title?.toLowerCase().includes(query.trim().toLowerCase()))
    : problems;

  return (
    <AppShell>
      <PageBody>
        <PageHeader title={title} detail={detail} />

        {banner}

        {error && <Note tone="redline" className="mb-4">{error}</Note>}

        <Module ticks>
          <ModuleHead
            label={moduleLabel}
            right={
              <span className="t-data text-ink-3">
                {loading ? '——' : `${filtered.length} of ${problems.length}`}
              </span>
            }
          />

          {!loading && problems.length > 0 && (
            <div className="border-b border-rule p-2.5">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by title"
                aria-label="Filter problems by title"
                className="h-8 max-w-sm"
              />
            </div>
          )}

          <div className={cn('hidden items-center gap-x-3 border-b border-rule bg-sheet-sunk px-3 py-1.5 md:grid', GRID_MD)}>
            <span className="t-micro text-ink-3">No.</span>
            <span className="t-micro text-ink-3">Title</span>
            <span className="t-micro text-ink-3">Diff</span>
            <span className="t-micro text-ink-3">Topic</span>
            <span className="t-micro text-right text-ink-3">Action</span>
          </div>

          {loading ? (
            <Plotter label="Loading problems" />
          ) : filtered.length === 0 ? (
            <EmptySheet
              title={problems.length === 0 ? emptyTitle : 'No problem matches that filter'}
              detail={problems.length === 0 ? emptyDetail : 'Try a different title fragment.'}
            />
          ) : (
            <ul>
              {filtered.map((problem, index) => (
                <li
                  key={problem._id}
                  className={cn(
                    'flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:bg-sheet-hover',
                    'md:grid md:items-center md:gap-x-3 md:gap-y-0 md:py-2',
                    index > 0 && 'border-t border-rule-faint',
                    GRID_MD
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3 md:contents">
                    <span className="t-body min-w-0 flex-1 truncate font-medium text-ink md:col-start-2 md:row-start-1">
                      {problem.title}
                    </span>
                    <span className="flex shrink-0 items-center justify-end gap-1.5 md:col-start-5 md:row-start-1">
                      {renderActions(problem, { removeLocally })}
                    </span>
                  </span>

                  <span className="flex min-w-0 items-center gap-3 md:contents">
                    <span className="t-data shrink-0 text-ink-3 md:col-start-1 md:row-start-1">
                      {problemNo(problem.problemNumber)}
                    </span>
                    <span className="shrink-0 md:col-start-3 md:row-start-1">
                      <DifficultyMark difficulty={problem.difficulty} />
                    </span>
                    <span className="min-w-0 md:col-start-4 md:row-start-1">
                      <Chip className="max-w-full truncate">
                        {Array.isArray(problem.tags) ? problem.tags.join(', ') : problem.tags}
                      </Chip>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Module>
      </PageBody>
    </AppShell>
  );
}
