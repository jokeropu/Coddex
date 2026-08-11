import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Send, Bot, User, CornerDownLeft, Square } from 'lucide-react';
import { API_BASE } from '../utils/axiosClient';
import ChatMarkdown from './ChatMarkdown';
import { cn } from '../design/cn';
import { Button, Input, Note } from '../design/primitives';

const OPENERS = [
  'What approach should I take?',
  'Why is my solution failing?',
  'What is the time complexity?',
  'Give me a hint, not the answer',
];

function ChatAi({ problem, code, language }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const contextRef = useRef({ code, language });
  contextRef.current = { code, language };

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const ask = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || streaming) return;

    const history = [...messages, { role: 'user', parts: [{ text: trimmed }] }];
    setMessages([...history, { role: 'model', parts: [{ text: '' }] }]);
    setStreaming(true);
    setError('');
    reset();

    const controller = new AbortController();
    abortRef.current = controller;

    const push = (chunk) => setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, parts: [{ text: last.parts[0].text + chunk }] };
      return next;
    });

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          title: problem.title,
          description: problem.description,
          testCases: problem.visibleTestCases,
          startCode: problem.startCode,
          userCode: contextRef.current.code,
          language: contextRef.current.language,
          contestId: problem.contestId,
        }),
      });

      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'The assistant could not be reached.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          if (!event.startsWith('data: ')) continue;

          const payload = event.slice(6);
          if (payload === '[DONE]') continue;

          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) push(parsed.text);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;

      console.error('AI chat error:', err);
      setError(err.message || 'The assistant could not be reached.');
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === 'model' && !last.parts[0].text ? prev.slice(0, -1) : prev;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, problem, reset]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center border border-rule bg-sheet-sunk">
              <Bot className="h-4 w-4 text-line" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="t-h3 text-ink">Ask about this sheet</p>
              <p className="t-body-sm max-w-xs text-ink-2">
                The assistant can see the statement, the visible cases and the code in your editor.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-1.5">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => ask(o)}
                  className="t-body-sm border border-rule px-3 py-2 text-left text-ink-2 transition-colors hover:border-line hover:bg-sheet-hover hover:text-ink"
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const text = msg.parts[0].text;
              const isStreamingHead = streaming && index === messages.length - 1;

              return (
                <div
                  key={index}
                  className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center border',
                      isUser ? 'border-rule-strong bg-sheet-sunk' : 'border-line/50 bg-line/10'
                    )}
                    aria-hidden
                  >
                    {isUser
                      ? <User className="h-3 w-3 text-ink-2" strokeWidth={1.75} />
                      : <Bot className="h-3 w-3 text-line" strokeWidth={1.75} />}
                  </span>

                  <div
                    className={cn(
                      't-body min-w-0 border px-3 py-2',
                      isUser
                        ? 'max-w-[85%] whitespace-pre-wrap border-rule-strong bg-sheet-sunk text-ink'
                        : 'max-w-[92%] border-rule bg-sheet-raised text-ink-2'
                    )}
                  >
                    {isUser ? text : (
                      text
                        ? <ChatMarkdown>{text}</ChatMarkdown>
                        : <span className="plotting block h-[2px] w-16 bg-rule-faint" role="status" aria-label="Assistant is replying" />
                    )}
                    {!isUser && isStreamingHead && text && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-line/70" aria-hidden />
                    )}
                  </div>
                </div>
              );
            })}

            {error && <Note tone="redline">{error}</Note>}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit((d) => ask(d.message))}
        className="shrink-0 border-t border-rule bg-sheet-sunk p-2.5"
      >
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask about this problem…"
            aria-label="Ask the assistant about this problem"
            invalid={!!errors.message}
            {...register('message', { required: true, minLength: 2 })}
          />
          {streaming ? (
            <Button type="button" tone="quiet" size="md" onClick={stop} aria-label="Stop generating">
              <Square className="h-3 w-3 fill-current" strokeWidth={2} />
            </Button>
          ) : (
            <Button type="submit" tone="line" size="md" aria-label="Send">
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          )}
        </div>
        <p className="t-micro mt-1.5 flex items-center gap-1 text-ink-3">
          <CornerDownLeft className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
          Answers are guidance, not verified solutions
        </p>
      </form>
    </div>
  );
}

export default ChatAi;
