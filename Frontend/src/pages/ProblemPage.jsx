import { useState, useEffect, useRef, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import Editor from '@monaco-editor/react';
import { useParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import axiosClient from "../utils/axiosClient"
import SubmissionHistory from "../components/SubmissionHistory"
import ChatAi from '../components/ChatAi';
import Editorial from '../components/Editorial';
import Discussion from '../components/Discussion';
import { fetchDrafts, clearDraftRemote } from '../utils/codeDraftApi';
import { updateUserProfile } from '../authSlice';
import { getLocalDraft, setLocalDraft, clearLocalDraft } from '../utils/codeDraftLocal';
import { cn, formatMemory, formatRuntime } from '../design/cn';
import { NoCopy } from '../design/primitives';
import { Check, X } from 'lucide-react';

const errorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.replace(/^Error:\s*/, '');
  return data?.message || data?.error || error?.message || fallback;
};

const langMap = {
        cpp: 'C++',
        c: 'C',
        java: 'Java',
        javascript: 'JavaScript',
        python: 'Python'
};

const LEFT_TABS = [
  {
    key: 'description',
    label: 'Description',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'editorial',
    label: 'Editorial',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'solutions',
    label: 'Solutions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: 'submissions',
    label: 'Submissions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M4 7h16M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7v11a2 2 0 002 2h12a2 2 0 002-2V7" />
      </svg>
    ),
  },
  {
    key: 'chatAI',
    label: 'ChatAI',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

const DIFFICULTY_BADGE = {
  easy: 'text-approved border-approved/45 bg-[color-mix(in_srgb,var(--c-approved)_13%,transparent)]',
  medium: 'text-caution border-caution/45 bg-[color-mix(in_srgb,var(--c-caution)_13%,transparent)]',
  hard: 'text-redline border-redline/45 bg-[color-mix(in_srgb,var(--c-redline)_13%,transparent)]',
};

const LANGUAGE_ACCENT = {
  javascript: 'text-yellow-400',
  java: 'text-orange-400',
  cpp: 'text-blue-400',
  c: 'text-sky-400',
  python: 'text-green-400',
};

const HintsList = ({ hints }) => {
  const [revealed, setRevealed] = useState([]);

  if (!hints || hints.length === 0) {
    return <p className="text-ink-2 text-sm">No hints have been added for this problem.</p>;
  }

  const toggle = (index) => {
    setRevealed((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  return (
    <NoCopy className="space-y-2">
      {hints.map((hint, index) => (
        <div key={index} className="border border-rule rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between px-4 py-2 bg-sheet-sunk hover:bg-sheet-sunk transition-colors text-sm font-medium"
          >
            Hint {index + 1}
            <span className="text-ink-3">{revealed.includes(index) ? 'Hide' : 'Show'}</span>
          </button>
          {revealed.includes(index) && (
            <div className="px-4 py-3 text-sm bg-sheet-raised">{hint}</div>
          )}
        </div>
      ))}
    </NoCopy>
  );
};

const ReferenceSolutions = ({ solutions }) => {
  if (!solutions || solutions.length === 0) {
    return <p className="text-ink-2 text-sm">No reference solutions have been added for this problem.</p>;
  }

  return (
    <NoCopy className="space-y-4">
      {solutions.map((solution, index) => (
        <div key={index} className="border border-rule rounded-lg overflow-hidden shadow-sm">
          <div className="bg-sheet-sunk px-4 py-2 border-b border-rule">
            <h4 className="font-semibold text-sm text-line">{solution?.language}</h4>
          </div>
          <div className="p-4 bg-sheet-raised">
            <pre className="bg-sheet-sunk text-ink p-4 rounded-lg text-sm overflow-x-auto">
              <code>{solution?.completeCode}</code>
            </pre>
          </div>
        </div>
      ))}
    </NoCopy>
  );
};

export const CaseRow = ({ index, tc, passed }) => (
  <div className="overflow-hidden rounded-xl border border-rule bg-sheet-raised">
    <div className="flex items-center justify-between gap-2 border-b border-rule px-3.5 py-2.5">
      <span className="t-body font-bold text-ink">Case {index + 1}</span>
      <span
        className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
        style={{
          color: passed ? 'var(--c-approved)' : 'var(--c-redline)',
          background: `color-mix(in srgb, ${passed ? 'var(--c-approved)' : 'var(--c-redline)'} 15%, transparent)`,
        }}
      >
        {passed ? 'Passed' : 'Failed'}
      </span>
    </div>
    <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-2 px-3.5 py-3">
      {[['Input', tc.stdin], ['Expected', tc.expected_output], ['Output', tc.stdout]].map(
        ([label, value]) => (
          <Fragment key={label}>
            <dt className="t-body-sm text-ink-3">{label}</dt>
            <dd
              className={cn(
                't-data min-w-0 whitespace-pre-wrap break-words',
                label === 'Output' && !passed ? 'font-semibold text-redline' : 'text-ink'
              )}
            >
              {value ?? '—'}
            </dd>
          </Fragment>
        )
      )}
    </dl>
  </div>
);

export const VerdictBanner = ({ ok, title, detail, metrics = [] }) => {
  const tone = ok ? 'var(--c-approved)' : 'var(--c-redline)';
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border p-5"
      style={{
        borderColor: `color-mix(in srgb, ${tone} 34%, transparent)`,
        background: `linear-gradient(90deg, color-mix(in srgb, ${tone} 17%, transparent), color-mix(in srgb, ${tone} 4%, transparent))`,
      }}
      role="status"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: tone, color: ok ? 'var(--c-on-approved)' : 'var(--c-on-redline)' }}
        aria-hidden
      >
        {ok ? <Check className="h-6 w-6" strokeWidth={3} /> : <X className="h-6 w-6" strokeWidth={3} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]" style={{ color: tone }}>
          {title}
        </p>
        {detail && <p className="t-body-sm mt-0.5 text-ink-2">{detail}</p>}
      </div>

      {metrics.length > 0 && (
        <div className="flex flex-wrap items-start gap-y-3">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={cn(
                'shrink-0 whitespace-nowrap px-5 first:pl-0 last:pr-0',
                i > 0 && 'border-l border-rule-faint'
              )}
            >
              <p className="font-mono text-[19px] font-semibold leading-none text-ink">
                {m.value}
                {m.unit && <span className="ml-1 text-[13px] text-ink-3">{m.unit}</span>}
              </p>
              <p className="t-micro mt-1 text-ink-3">{m.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProblemPage = () => {
  const [problem, setProblem] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [activeLeftTab, setActiveLeftTab] = useState('description');
  const [activeRightTab, setActiveRightTab] = useState('code');
  const [unlocking, setUnlocking] = useState(null);
  const [unlockError, setUnlockError] = useState('');
  const editorRef = useRef(null);
  let {problemId}  = useParams();

  const remoteDraftsRef = useRef({});

  const { handleSubmit } = useForm();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleUnlock = async (type) => {
    setUnlocking(type);
    setUnlockError('');
    try {
      const { data } = await axiosClient.post(`/unlock/${problemId}`, { type });
      dispatch(updateUserProfile({ credits: data.credits }));
      const response = await axiosClient.get(`/problem/problemById/${problemId}`);
      setProblem(response.data);
    } catch (error) {
      setUnlockError(error.response?.data?.error || 'Failed to unlock. Please try again.');
    } finally {
      setUnlocking(null);
    }
  };

 useEffect(() => {
    const fetchProblem = async () => {
      setLoading(true);
      try {

        const response = await axiosClient.get(`/problem/problemById/${problemId}`);

        const initialCode = response.data.startCode.find(sc => sc.language === langMap[selectedLanguage]).initialCode;

        setProblem(response.data);

        const localDraft = getLocalDraft(problemId, null, selectedLanguage);
        if (localDraft != null) {
          setCode(localDraft);
        } else {
          const remoteDrafts = await fetchDrafts(problemId);
          remoteDraftsRef.current = remoteDrafts;
          setCode(remoteDrafts[selectedLanguage] ?? initialCode);
        }
        setLoading(false);

      } catch (error) {
        console.error('Error fetching problem:', error);
        setLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  useEffect(() => {
    if (problem) {
      const initialCode = problem.startCode.find(sc => sc.language === langMap[selectedLanguage]).initialCode;
      const localDraft = getLocalDraft(problemId, null, selectedLanguage);
      setCode(localDraft ?? remoteDraftsRef.current[selectedLanguage] ?? initialCode);
    }

  }, [selectedLanguage, problem]);

  const handleEditorChange = (value) => {
    const nextCode = value || '';
    setCode(nextCode);
    setLocalDraft(problemId, null, selectedLanguage, nextCode);
  };

  const handleClearCode = () => {
    if (!problem) return;
    const defaultCode = problem.startCode.find(sc => sc.language === langMap[selectedLanguage])?.initialCode || '';
    setCode(defaultCode);
    clearLocalDraft(problemId, null, selectedLanguage);
    clearDraftRemote(problemId, null, selectedLanguage);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
  };

  const handleRun = async () => {
    setLoading(true);
    setRunResult(null);

    try {
      const response = await axiosClient.post(`/submission/run/${problemId}`, {
        code,
        language: selectedLanguage
      });

      setRunResult(response.data);
      setLoading(false);
      setActiveRightTab('testcase');

    } catch (error) {
      console.error('Error running code:', error);
      setRunResult({
        success: false,
        error: errorMessage(error, 'Internal server error')
      });
      setLoading(false);
      setActiveRightTab('testcase');
    }
  };

  const handleSubmitCode = async () => {
    setLoading(true);
    setSubmitResult(null);

    try {
        const response = await axiosClient.post(`/submission/submit/${problemId}`, {
        code:code,
        language: selectedLanguage
      });

       setSubmitResult(response.data);
       setLoading(false);
       setActiveRightTab('result');

    } catch (error) {
      console.error('Error submitting code:', error);
      setSubmitResult({
        accepted: false,
        error: errorMessage(error, 'Your submission could not be processed. Try again.')
      });
      setLoading(false);
      setActiveRightTab('result');
    }
  };

  const renderActionBar = (backLabel, backTab) => (
    <div className="p-3 border-t border-rule bg-sheet-sunk flex justify-between shrink-0">
      <div className="flex gap-2">
        <button className="btn-quiet" onClick={() => setActiveRightTab(backTab)}>
          {backLabel}
        </button>
      </div>
      <div className="flex gap-2">
        <button className="btn-outline-x gap-1.5" onClick={handleRun} disabled={loading}>
          {!loading && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          Run
        </button>
        <button className="btn-line gap-1.5" onClick={handleSubmitCode} disabled={loading}>
          {!loading && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
          Submit
        </button>
      </div>
    </div>
  );

  const getLanguageForMonaco = (lang) => {
    switch (lang) {
      case 'javascript': return 'javascript';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      case 'c': return 'c';
      case 'python': return 'python';
      default: return 'javascript';
    }
  };

  if (loading && !problem) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center min-h-screen bg-sheet-raised">
        <div className="plotting h-[3px] w-44 bg-rule-faint" role="progressbar" aria-label="Loading" />
        <p className="text-ink-2 text-sm">Loading problem…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-sheet-raised">
      <div className="w-1/2 flex flex-col border-r border-rule">
        <div className="flex items-center bg-sheet-sunk backdrop-blur border-b border-rule shrink-0">
        <Link
          to="/"
          className="t-label ml-2 mr-1 flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-ink-3 transition-colors hover:text-ink"
          title="Back to problems"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Problems
        </Link>
        <div className="flex items-center gap-1 px-2 shrink-0">
          {LEFT_TABS.map((t) => (
            <button
              key={t.key}
              className={`t-label -mb-px flex items-center gap-2 px-3 py-2.5 transition-colors ${activeLeftTab === t.key ? 'border-b-2 border-line text-line font-semibold' : 'border-b-2 border-transparent text-ink-3 hover:text-ink'}`}
              onClick={() => setActiveLeftTab(t.key)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {problem && (
            <>
              {activeLeftTab === 'description' && (
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold">
                      <span className="text-ink-3 mr-1">{problem.problemNumber}.</span>
                      {problem.title}
                    </h1>
                    <div className={`t-micro inline-flex items-center rounded-full border px-2.5 py-1 leading-none ${DIFFICULTY_BADGE[problem.difficulty?.toLowerCase()] || 'text-ink-2 border-rule'}`}>
                      {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                    </div>
                    <div className="t-micro inline-flex items-center rounded-full border border-rule px-2.5 py-1 leading-none text-ink-2">{problem.tags}</div>
                  </div>

                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {problem.description}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[color-mix(in_srgb,var(--c-line)_12%,transparent)] text-line text-xs">✓</span>
                      Examples
                    </h3>
                    <div className="space-y-4">
                      {problem.visibleTestCases.map((example, index) => (
                        <div key={index} className="bg-sheet-sunk border border-rule p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-sm">Example {index + 1}</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-ink-3 font-mono">Input:</span>
                              <pre className="whitespace-pre-wrap font-mono bg-sheet-sunk rounded p-2 mt-1">{example.input}</pre>
                            </div>
                            <div>
                              <span className="text-ink-3 font-mono">Output:</span>
                              <pre className="whitespace-pre-wrap font-mono bg-sheet-sunk rounded p-2 mt-1">{example.output}</pre>
                            </div>
                            <div className="font-sans text-ink-2"><span className="text-ink-3 font-mono">Explanation:</span> {example.explanation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeLeftTab === 'editorial' && (
                <div className="prose max-w-none">
                  <h2 className="text-xl font-bold mb-4">Editorial</h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {!problem.hasVideo ? (
                      <div className="not-prose flex flex-col items-center text-center gap-4 py-12 px-4 rounded-lg border border-rule bg-sheet-sunk">
                        <p className="text-lg font-semibold">Video Solution Not Available</p>
                        <p className="text-sm text-ink-2">No video walkthrough has been uploaded for this problem yet.</p>
                      </div>
                    ) : !problem.videoUnlocked ? (
                      <div className="not-prose flex flex-col items-center text-center gap-4 py-12 px-4 rounded-lg border border-rule bg-sheet-sunk">
                        <p className="text-lg font-semibold">This video solution is for Premium members</p>
                        <p className="text-sm text-ink-2">Subscribe to Coddex Premium, or unlock just this problem's video with credits.</p>
                        {unlockError && <p className="text-sm text-redline">{unlockError}</p>}
                        <div className="flex gap-2">
                          <Link to="/premium" className="btn-caution">Go Premium</Link>
                          <button
                            className="btn-outline-x"
                            disabled={unlocking==='video' || (user?.credits ?? 0) < problem.videoUnlockCost}
                            onClick={() => handleUnlock('video')}
                          >
                            {unlocking==='video' ? <span className="plotting inline-block h-[2px] w-8 bg-rule-faint align-middle" /> : `Unlock for ${problem.videoUnlockCost} credits`}
                          </button>
                        </div>
                        <p className="text-xs text-ink-3">You have {user?.credits ?? 0} credits</p>
                      </div>
                    ) : (
                      <Editorial
                        provider={problem.videoProvider}
                        youtubeId={problem.youtubeId}
                        title={problem.videoTitle}
                        author={problem.videoAuthor}
                        secureUrl={problem.secureUrl}
                        thumbnailUrl={problem.thumbnailUrl}
                        duration={problem.duration}
                      />
                    )}
                  </div>

                  <div className="not-prose mt-8">
                    <h3 className="text-lg font-bold mb-4">Hints & Reference Solutions</h3>
                    {problem.hints === undefined ? (
                      <div className="flex flex-col items-center text-center gap-4 py-12 px-4 rounded-lg border border-rule bg-sheet-sunk">
                        <p className="text-lg font-semibold">Hints & reference solutions are for Premium members</p>
                        <p className="text-sm text-ink-2">Subscribe to Coddex Premium, or unlock just this problem's hints and reference solutions with credits.</p>
                        {unlockError && <p className="text-sm text-redline">{unlockError}</p>}
                        <div className="flex gap-2">
                          <Link to="/premium" className="btn-caution">Go Premium</Link>
                          <button
                            className="btn-outline-x"
                            disabled={unlocking==='editorial' || (user?.credits ?? 0) < problem.editorialUnlockCost}
                            onClick={() => handleUnlock('editorial')}
                          >
                            {unlocking==='editorial' ? <span className="plotting inline-block h-[2px] w-8 bg-rule-faint align-middle" /> : `Unlock for ${problem.editorialUnlockCost} credits`}
                          </button>
                        </div>
                        <p className="text-xs text-ink-3">You have {user?.credits ?? 0} credits</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div>
                          <h4 className="font-semibold mb-3">Hints</h4>
                          <HintsList hints={problem.hints} />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Reference Solutions</h4>
                          <ReferenceSolutions solutions={problem.referenceSolution} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeLeftTab === 'solutions' && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Solutions</h2>
                  <Discussion problemId={problemId} />
                </div>
              )}

              {activeLeftTab === 'submissions' && (
                <div>
                  <h2 className="text-xl font-bold mb-4">My Submissions</h2>
                  <div className="text-ink-2">
                    <SubmissionHistory problemId={problemId} />
                  </div>
                </div>
              )}

              {activeLeftTab === 'chatAI' && (
                <div className="flex h-full min-h-0 flex-col">
                  <ChatAi problem={problem} code={code} language={langMap[selectedLanguage]} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="w-1/2 flex flex-col bg-sheet-raised">
        <div className="flex items-center gap-1 bg-sheet-sunk border-b border-rule px-4 shrink-0">
          <button
            className={`t-label -mb-px px-3 py-2.5 transition-colors ${activeRightTab === 'code' ? 'border-b-2 border-line text-line font-semibold' : 'border-b-2 border-transparent text-ink-3 hover:text-ink'}`}
            onClick={() => setActiveRightTab('code')}
          >
            Code
          </button>
          <button
            className={`t-label -mb-px px-3 py-2.5 transition-colors ${activeRightTab === 'testcase' ? 'border-b-2 border-line text-line font-semibold' : 'border-b-2 border-transparent text-ink-3 hover:text-ink'}`}
            onClick={() => setActiveRightTab('testcase')}
          >
            Testcase
          </button>
          <button
            className={`t-label -mb-px px-3 py-2.5 transition-colors ${activeRightTab === 'result' ? 'border-b-2 border-line text-line font-semibold' : 'border-b-2 border-transparent text-ink-3 hover:text-ink'}`}
            onClick={() => setActiveRightTab('result')}
          >
            Result
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {activeRightTab === 'code' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center p-3 border-b border-rule bg-sheet-sunk shrink-0">
                <div className="flex gap-2">
                  {['javascript', 'java', 'cpp', 'c', 'python'].map((lang) => (
                    <button
                      key={lang}
                      className={`gap-1.5 ${selectedLanguage === lang ? 'btn-line' : 'btn-quiet'}`}
                      onClick={() => handleLanguageChange(lang)}
                    >
                      <span className={`h-2 w-2 rounded-full ${selectedLanguage === lang ? 'bg-brand-content' : LANGUAGE_ACCENT[lang]} bg-current`} />
                      {langMap[lang]}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-quiet gap-1.5"
                  onClick={handleClearCode}
                  title="Reset to starter code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Clear
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={getLanguageForMonaco(selectedLanguage)}
                  value={code}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    renderLineHighlight: 'line',
                    selectOnLineNumbers: true,
                    roundedSelection: false,
                    readOnly: false,
                    cursorStyle: 'line',
                    mouseWheelZoom: true,
                  }}
                />
              </div>

              {renderActionBar('Console', 'testcase')}
            </div>
          )}

          {activeRightTab === 'testcase' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="font-semibold mb-4">Test Results</h3>
              {runResult ? (
                <div className="mb-4 space-y-3">
                  <VerdictBanner
                    ok={!!runResult.success}
                    title={runResult.success ? 'All test cases passed' : 'Some test cases failed'}
                    detail={runResult.success ? undefined : runResult.error}
                    metrics={
                      runResult.success
                        ? [
                            { label: 'Runtime', value: formatRuntime(runResult.runtime) },
                            { label: 'Memory', value: formatMemory(runResult.memory) },
                          ]
                        : []
                    }
                  />

                  <div className="space-y-2">
                    {(runResult.testCases || []).map((tc, i) => (
                      <CaseRow
                        key={i}
                        index={i}
                        tc={tc}
                        passed={runResult.success ? true : tc.status_id === 3}
                      />
                    ))}
                  </div>
                </div>
                ) : (
                  <div className="text-center py-16 text-ink-3">
                    <p>Click "Run" to test your code with the example test cases.</p>
                  </div>
                )}
              </div>
              {renderActionBar('Code', 'code')}
            </div>
          )}

          {activeRightTab === 'result' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="font-semibold mb-4">Submission Result</h3>
              {submitResult ? (
                <VerdictBanner
                  ok={!!submitResult.accepted}
                  title={submitResult.accepted ? 'Accepted' : submitResult.error}
                  detail={
                    submitResult.accepted || submitResult.totalTestCases === undefined
                      ? undefined
                      : `${submitResult.passedTestCases}/${submitResult.totalTestCases} test cases passed`
                  }
                  metrics={
                    submitResult.accepted
                      ? [
                          {
                            label: 'Test cases',
                            value: `${submitResult.passedTestCases}/${submitResult.totalTestCases}`,
                          },
                          { label: 'Runtime', value: formatRuntime(submitResult.runtime) },
                          { label: 'Memory', value: formatMemory(submitResult.memory) },
                        ]
                      : []
                  }
                />
                ) : (
                  <div className="text-center py-16 text-ink-3">
                    <p>Click "Submit" to submit your solution for evaluation.</p>
                  </div>
                )}
              </div>
              {renderActionBar('Code', 'code')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemPage;
