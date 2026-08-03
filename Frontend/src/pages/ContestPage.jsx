import { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useParams, Link } from 'react-router';
import { Play, Send, RotateCcw, Check, Trophy, Timer, ArrowLeft } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { fetchDrafts, clearDraftRemote } from '../utils/codeDraftApi';
import { getLocalDraft, setLocalDraft, clearLocalDraft } from '../utils/codeDraftLocal';
import AppShell from '../design/AppShell';
import { useGround } from '../design/ground';
import { cn, difficultyMeta } from '../design/cn';
import {
  Button, Note, Plotter, EmptySheet, DifficultyMark, PageBody, PageHeader,
} from '../design/primitives';
import { Tabs, TabsBar, Tab, TabPanel } from '../design/overlays';
import { CaseRow, VerdictBanner } from './ProblemPage';

const langMap = { cpp: 'C++', c: 'C', java: 'Java', javascript: 'JavaScript', python: 'Python' };
const LANGS = ['javascript', 'java', 'cpp', 'c', 'python'];

const formatDuration = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

function ContestPage() {
  const { contestId } = useParams();
  const { ground } = useGround();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [problemDetail, setProblemDetail] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const editorRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('code');
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const [mobilePane, setMobilePane] = useState('sheet');

  const remoteDraftsRef = useRef({});

  useEffect(() => {
    const fetchContest = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get(`/contest/${contestId}`);
        setContest(data);
        if (data.problems?.length > 0) setSelectedProblemId(data.problems[0]._id);
      } catch (error) {
        console.error('Error fetching contest:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [contestId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedProblemId) return;
    const fetchProblem = async () => {
      setRunResult(null);
      setSubmitResult(null);
      setActiveRightTab('code');
      try {
        const { data } = await axiosClient.get(`/problem/problemById/${selectedProblemId}`);
        setProblemDetail(data);
        const initialCode =
          data.startCode.find((sc) => sc.language === langMap[selectedLanguage])?.initialCode || '';

        const localDraft = getLocalDraft(selectedProblemId, contestId, selectedLanguage);
        if (localDraft != null) {
          setCode(localDraft);
        } else {
          const remoteDrafts = await fetchDrafts(selectedProblemId, contestId);
          remoteDraftsRef.current[selectedProblemId] = remoteDrafts;
          setCode(remoteDrafts[selectedLanguage] ?? initialCode);
        }
      } catch (error) {
        console.error('Error fetching problem:', error);
      }
    };
    fetchProblem();

  }, [selectedProblemId]);

  useEffect(() => {
    if (problemDetail) {
      const initialCode =
        problemDetail.startCode.find((sc) => sc.language === langMap[selectedLanguage])?.initialCode || '';
      const localDraft = getLocalDraft(selectedProblemId, contestId, selectedLanguage);
      setCode(
        localDraft ?? remoteDraftsRef.current[selectedProblemId]?.[selectedLanguage] ?? initialCode
      );
    }

  }, [selectedLanguage, problemDetail]);

  const status = contest?.status;
  const isVirtual = status === 'ended';

  const countdown = useMemo(() => {
    if (!contest) return null;
    if (status === 'upcoming') return { label: 'Opens in', ms: new Date(contest.startTime).getTime() - now };
    if (status === 'live') return { label: 'Closes in', ms: new Date(contest.endTime).getTime() - now };
    return null;
  }, [contest, status, now]);

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    setActiveRightTab('console');
    setMobilePane('board');
    try {
      const { data } = await axiosClient.post(`/contest/${contestId}/run/${selectedProblemId}`, {
        code,
        language: selectedLanguage,
      });
      setRunResult(data);
    } catch (error) {
      setRunResult({
        success: false,
        error: error.response?.data?.error || 'The judge could not be reached. Try running again.',
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    setActiveRightTab('verdict');
    setMobilePane('board');
    try {
      const { data } = await axiosClient.post(`/contest/${contestId}/submit/${selectedProblemId}`, {
        code,
        language: selectedLanguage,
      });
      setSubmitResult(data);
      if (data.accepted && !data.isVirtual) {
        setSolvedIds((prev) => new Set(prev).add(selectedProblemId));
      }
    } catch (error) {
      setSubmitResult({
        accepted: false,
        error: error.response?.data?.error || 'The judge could not be reached. Your code was not lost — submit again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const busy = running || submitting;

  if (loading) {
    return (
      <AppShell fill>
        <div className="flex h-full items-center justify-center"><Plotter label="Loading contest" /></div>
      </AppShell>
    );
  }

  if (!contest) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet
            title="Contest not found"
            detail="This contest may have been removed, or the link is wrong."
            action={
              <Button size="sm" asChild>
                <Link to="/contests"><ArrowLeft className="h-3 w-3" strokeWidth={2} />All contests</Link>
              </Button>
            }
          />
        </PageBody>
      </AppShell>
    );
  }

  if (status === 'upcoming') {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <PageHeader title={contest.title} detail={contest.description} />
          <div className="sheet tooth corner-ticks flex flex-col items-center gap-4 px-6 py-12 text-center">
            <Timer className="h-6 w-6 text-line" strokeWidth={1.5} aria-hidden />
            <div className="flex flex-col gap-1">
              <span className="t-label text-ink-3">{countdown?.label}</span>
              <span className="font-mono text-4xl font-semibold tabular-nums text-ink">
                {formatDuration(countdown?.ms ?? 0)}
              </span>
            </div>
            <p className="t-body-sm max-w-sm text-ink-2">
              The problems are sealed until the contest opens. Come back then — or set a reminder.
            </p>
            <Button size="sm" tone="quiet" asChild>
              <Link to="/contests"><ArrowLeft className="h-3 w-3" strokeWidth={2} />All contests</Link>
            </Button>
          </div>
        </PageBody>
      </AppShell>
    );
  }

  const alreadySolved = solvedIds.has(selectedProblemId) && !isVirtual;

  const titleFields = (
    <>
      <div className="flex min-w-0 items-center border-r border-rule px-2.5">
        <span className="t-body-sm truncate text-ink-2">{contest.title}</span>
      </div>
      {countdown && (
        <div className="flex shrink-0 items-center gap-1.5 border-r border-rule px-2.5">
          <Timer className="h-3 w-3 text-ink-3" strokeWidth={1.75} aria-hidden />
          <span className="t-micro text-ink-3">{countdown.label}</span>
          <span
            className="t-data font-semibold"
            style={{ color: countdown.ms < 300000 ? 'var(--c-redline)' : 'var(--c-ink)' }}
          >
            {formatDuration(countdown.ms)}
          </span>
        </div>
      )}
      {isVirtual && (
        <div className="hidden shrink-0 items-center border-r border-rule px-2.5 sm:flex">
          <span className="t-micro text-caution">Practice — unrated</span>
        </div>
      )}
      <div className="flex-1" />
      <Link
        to={`/contest/${contestId}/leaderboard`}
        className="t-field flex shrink-0 items-center gap-1.5 border-l border-rule px-2.5 text-ink-2 transition-colors hover:bg-sheet-hover hover:text-ink"
      >
        <Trophy className="h-3 w-3" strokeWidth={1.75} />
        <span className="hidden sm:inline">Standings</span>
      </Link>
    </>
  );

  return (
    <AppShell fill titleFields={titleFields}>
      <div className="flex h-full flex-col">
        {(contest.isCreator || isVirtual) && (
          <div className="shrink-0 border-b border-rule px-3 py-1.5">
            {contest.isCreator ? (
              <p className="t-body-sm text-redline">
                You created this contest, so you cannot submit to it.
              </p>
            ) : (
              <p className="t-body-sm text-caution">
                Practice run — submissions here do not score, rank, or move your rating.
              </p>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex shrink-0 items-stretch border-b border-rule-strong bg-sheet lg:hidden">
            {[
              ['sheet', 'Problem'],
              ['board', 'Draft'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobilePane(key)}
                aria-pressed={mobilePane === key}
                className={cn(
                  't-field relative flex-1 border-r border-rule py-2 transition-colors last:border-r-0',
                  'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent',
                  mobilePane === key
                    ? 'bg-sheet-raised text-ink after:bg-line'
                    : 'text-ink-3 hover:bg-sheet-hover hover:text-ink-2'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 flex-col border-rule lg:flex lg:w-1/2 lg:flex-none lg:border-r',
              mobilePane === 'sheet' ? 'flex' : 'hidden'
            )}
          >
            <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-rule bg-sheet-sunk">
              {contest.problems.map((p, i) => {
                const meta = difficultyMeta(p.difficulty);
                const active = selectedProblemId === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProblemId(p._id)}
                    aria-pressed={active}
                    className={cn(
                      't-field relative flex shrink-0 items-center gap-1.5 border-r border-rule px-3 py-2 transition-colors',
                      'after:absolute after:inset-x-0 after:top-0 after:h-[2px] after:bg-transparent',
                      active
                        ? 'bg-sheet-raised text-ink after:bg-line'
                        : 'text-ink-3 hover:bg-sheet-hover hover:text-ink-2'
                    )}
                  >
                    {solvedIds.has(p._id) && (
                      <Check className="h-3 w-3 text-approved" strokeWidth={3} aria-label="Solved" />
                    )}
                    <span className="h-2.5 w-[3px]" style={{ background: meta.color }} aria-hidden />
                    <span className="max-w-[10rem] truncate">
                      {String.fromCharCode(65 + i)}. {p.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {problemDetail && (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <DifficultyMark difficulty={problemDetail.difficulty} />
                  </div>
                  <h1 className="t-h1 mb-4 text-ink">{problemDetail.title}</h1>
                  <div className="t-prose whitespace-pre-wrap text-ink-2">{problemDetail.description}</div>

                  <div className="mt-7">
                    <div className="mb-2.5 flex items-center gap-2">
                      <h2 className="t-label text-ink-2">Examples</h2>
                      <div className="h-px flex-1 bg-rule" aria-hidden />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {problemDetail.visibleTestCases.map((ex, index) => (
                        <div key={index} className="border border-rule">
                          <div className="flex items-center gap-2 border-b border-rule bg-sheet-sunk px-2.5 py-1">
                            <span className="t-micro text-line">Example {index + 1}</span>
                          </div>
                          <dl className="divide-y divide-rule-faint">
                            {[['Input', ex.input, true], ['Output', ex.output, true], ['Explanation', ex.explanation, false]].map(
                              ([label, value, mono]) =>
                                value ? (
                                  <div key={label} className="grid grid-cols-[76px_1fr] gap-2 px-2.5 py-1.5">
                                    <dt className="t-micro pt-[3px] text-ink-3">{label}</dt>
                                    <dd className={cn('min-w-0 whitespace-pre-wrap break-words', mono ? 't-data text-ink' : 't-body-sm text-ink-2')}>
                                      {value}
                                    </dd>
                                  </div>
                                ) : null
                            )}
                          </dl>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 flex-col lg:flex lg:w-1/2 lg:flex-none',
              mobilePane === 'board' ? 'flex' : 'hidden'
            )}
          >
            <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex min-h-0 flex-1 flex-col">
              <TabsBar className="shrink-0">
                <Tab value="code">Draft</Tab>
                <Tab value="console">Console</Tab>
                <Tab value="verdict">Verdict</Tab>
              </TabsBar>

              <TabPanel value="code" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-rule bg-sheet-sunk px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {LANGS.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        aria-pressed={selectedLanguage === lang}
                        className={cn(
                          't-field border px-2 py-1 transition-colors',
                          selectedLanguage === lang
                            ? 'border-line bg-line text-sheet'
                            : 'border-rule text-ink-3 hover:border-rule-strong hover:text-ink'
                        )}
                      >
                        {langMap[lang]}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="xs"
                    tone="quiet"
                    title="Reset to starter code"
                    onClick={() => {
                      if (!problemDetail) return;
                      const defaultCode =
                        problemDetail.startCode.find((sc) => sc.language === langMap[selectedLanguage])?.initialCode || '';
                      setCode(defaultCode);
                      clearLocalDraft(selectedProblemId, contestId, selectedLanguage);
                      clearDraftRemote(selectedProblemId, contestId, selectedLanguage);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                    Reset
                  </Button>
                </div>

                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                    value={code}
                    onChange={(value) => {
                      const nextCode = value || '';
                      setCode(nextCode);
                      setLocalDraft(selectedProblemId, contestId, selectedLanguage, nextCode);
                    }}
                    onMount={(editor) => { editorRef.current = editor; }}
                    theme={ground === 'night' ? 'vs-dark' : 'vs'}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
                      fontLigatures: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      glyphMargin: false,
                      folding: true,
                      lineDecorationsWidth: 8,
                      lineNumbersMinChars: 3,
                      renderLineHighlight: 'line',
                      smoothScrolling: true,
                      padding: { top: 12, bottom: 12 },
                      cursorBlinking: 'smooth',
                      mouseWheelZoom: true,
                    }}
                  />
                </div>

              </TabPanel>

              <TabPanel value="console" className="min-h-0 flex-1 overflow-y-auto p-3">
                {running ? (
                  <Plotter label="Running against visible cases" />
                ) : !runResult ? (
                  <EmptySheet
                    title="Console is clear"
                    detail="Run your draft against the visible cases before spending a submission."
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {runResult.error && !runResult.testCases ? (
                      <VerdictBanner ok={false} title="Could not run" detail={runResult.error} />
                    ) : (
                      <>
                        <VerdictBanner
                          ok={runResult.success}
                          title={runResult.success ? 'All cases passed' : 'Not passing yet'}
                          detail={
                            runResult.success
                              ? 'Every visible case matched. Submit to run the full hidden suite.'
                              : 'One or more visible cases did not match.'
                          }
                        />
                        <div className="flex flex-col gap-2.5">
                          {(runResult.testCases || []).map((tc, i) => (
                            <CaseRow key={i} index={i} tc={tc} passed={tc.status_id === 3} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabPanel>

              <TabPanel value="verdict" className="min-h-0 flex-1 overflow-y-auto p-3">
                {submitting ? (
                  <Plotter label="Submitting for approval" />
                ) : !submitResult ? (
                  <EmptySheet
                    title="Not yet submitted"
                    detail="Submit to have this problem checked against the full hidden suite."
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    <VerdictBanner
                      ok={submitResult.accepted}
                      title={submitResult.accepted ? 'Accepted' : submitResult.error || 'Rejected'}
                      detail={
                        submitResult.accepted
                          ? submitResult.isVirtual
                            ? 'Practice submission — unscored.'
                            : `Scored for this contest.`
                          : submitResult.totalTestCases != null
                            ? `Passed ${submitResult.passedTestCases} of ${submitResult.totalTestCases} test cases.`
                            : undefined
                      }
                      metrics={[
                        ...(submitResult.accepted && !submitResult.isVirtual
                          ? [{ label: 'Points', value: `+${submitResult.pointsAwarded}` }]
                          : []),
                        ...(submitResult.totalTestCases != null
                          ? [{
                              label: 'Cases',
                              value: `${submitResult.passedTestCases}/${submitResult.totalTestCases}`,
                            }]
                          : []),
                      ]}
                    />

                    {!submitResult.accepted && (
                      <Button size="sm" tone="outline" className="self-start" onClick={() => setActiveRightTab('code')}>Back to draft</Button>
                    )}
                  </div>
                )}
              </TabPanel>

              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-rule bg-sheet-sunk px-2 py-1.5">
                <span className="t-micro hidden text-ink-3 sm:inline">Drafts save as you type</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button size="sm" onClick={handleRun} loading={running} disabled={busy || contest.isCreator}>
                    <Play className="h-3 w-3" strokeWidth={2} />
                    Run
                  </Button>
                  <Button
                    size="sm"
                    tone="line"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={busy || contest.isCreator || alreadySolved}
                    title={alreadySolved ? 'Already accepted in this contest' : undefined}
                  >
                    <Send className="h-3 w-3" strokeWidth={2} />
                    {alreadySolved ? 'Accepted' : 'Submit'}
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default ContestPage;
