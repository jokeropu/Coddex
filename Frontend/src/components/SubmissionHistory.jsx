import { useState, useEffect } from 'react';
import { Check, X, TriangleAlert, Clock } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { cn, formatMemory, formatRuntime } from '../design/cn';
import { Note, Plotter, EmptySheet } from '../design/primitives';
import { Dialog, DialogContent } from '../design/overlays';

const STATUS = {
  accepted: { label: 'Accepted',     color: 'var(--c-approved)', icon: Check },
  wrong:    { label: 'Wrong Answer', color: 'var(--c-redline)',  icon: X },
  error:    { label: 'Runtime Error',color: 'var(--c-caution)',  icon: TriangleAlert },
  pending:  { label: 'Pending',      color: 'var(--c-line)',     icon: Clock },
};

const statusMeta = (s) => STATUS[s] || { label: s || 'Unknown', color: 'var(--c-ink-3)', icon: Clock };

const formatDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_110px_104px_104px] md:items-center md:gap-x-4';

const SubmissionHistory = ({ problemId }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(`/problem/submittedProblem/${problemId}`);
        setSubmissions(response.data);
        setError(null);
      } catch (err) {
        setError('Could not load your submissions. Refresh to try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [problemId]);

  if (loading) return <Plotter label="Loading submissions" />;
  if (error) return <Note tone="redline">{error}</Note>;

  if (submissions.length === 0) {
    return (
      <EmptySheet
        title="No submissions yet"
        detail="Every submission you make on this problem is logged here with its verdict, runtime and code."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-rule">
      <div className={cn('hidden border-b border-rule bg-sheet-sunk py-2.5 pl-[19px] pr-4', GRID)}>
        <span className="t-micro text-ink-3">Status</span>
        <span className="t-micro text-ink-3">Language</span>
        <span className="t-micro text-right text-ink-3">Runtime</span>
        <span className="t-micro text-right text-ink-3">Memory</span>
      </div>

      <ul>
        {submissions.map((sub, index) => {
          const meta = statusMeta(sub.status);
          const Icon = meta.icon;
          const failed = sub.status !== 'accepted' && sub.status !== 'pending';

          return (
            <li key={sub._id}>
              <button
                type="button"
                onClick={() => setSelected(sub)}
                style={{ borderLeft: `3px solid ${meta.color}` }}
                className={cn(
                  'w-full py-3 pl-3.5 pr-4 text-left transition-colors hover:bg-sheet-hover',
                  index > 0 && 'border-t border-rule-faint',
                  GRID
                )}
              >
                <span className="min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-semibold"
                    style={{
                      color: meta.color,
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    }}
                  >
                    <Icon className="h-3 w-3 shrink-0" strokeWidth={2.75} aria-hidden />
                    {meta.label}
                  </span>
                  <span className="t-body-sm mt-1 block text-ink-3">
                    {formatDate(sub.createdAt)}
                    {failed && ` · ${sub.testCasesPassed}/${sub.testCasesTotal} cases`}
                  </span>

                  <span className="t-data mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-ink-3 md:hidden">
                    <span>{sub.language}</span>
                    <span>{formatRuntime(sub.runtime)}</span>
                    <span>{formatMemory(sub.memory)}</span>
                  </span>
                </span>

                <span className="t-data hidden truncate text-ink-2 md:block">{sub.language}</span>

                <span className="t-data hidden whitespace-nowrap text-right text-ink-2 md:block">
                  {formatRuntime(sub.runtime)}
                </span>

                <span className="t-data hidden whitespace-nowrap text-right text-ink-2 md:block">
                  {formatMemory(sub.memory)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent
            width="max-w-3xl"
            title={statusMeta(selected.status).label}
            description={`${selected.language} · ${formatDate(selected.createdAt)}`}
          >
            <div className="mb-3 flex flex-wrap items-stretch rounded-lg border border-rule">
              {[
                ['Cases', `${selected.testCasesPassed}/${selected.testCasesTotal}`],
                ['Runtime', formatRuntime(selected.runtime)],
                ['Memory', formatMemory(selected.memory)],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col px-4 py-2.5',
                    i > 0 && 'border-l border-rule'
                  )}
                >
                  <span className="t-micro text-ink-3">{label}</span>
                  <span className="t-data-lg whitespace-nowrap font-semibold">{value}</span>
                </div>
              ))}
            </div>

            {selected.errorMessage && (
              <Note tone="redline" className="mb-3">{selected.errorMessage}</Note>
            )}

            <pre className="t-data max-h-[46vh] overflow-auto rounded-lg border border-rule bg-sheet-sunk p-3 text-ink">
              <code>{selected.code}</code>
            </pre>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SubmissionHistory;
