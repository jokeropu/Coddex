import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Send, Bot, User, CornerDownLeft } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { cn } from '../design/cn';
import { Button, Input, Note } from '../design/primitives';

const OPENERS = [
  'What approach should I take?',
  'Why is my solution failing?',
  'What is the time complexity?',
  'Give me a hint, not the answer',
];

function ChatAi({ problem }) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  const ask = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || pending) return;

    const updatedMessages = [...messages, { role: 'user', parts: [{ text: trimmed }] }];
    setMessages(updatedMessages);
    setPending(true);
    setFailed(false);
    reset();

    try {
      const response = await axiosClient.post('/ai/chat', {
        messages: updatedMessages,
        title: problem.title,
        description: problem.description,
        testCases: problem.visibleTestCases,
        startCode: problem.startCode,
        contestId: problem.contestId,
      });
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: response.data.message }] }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

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
                The assistant can see the statement, the visible cases and the starter code.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-1.5">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => { setValue('message', o); ask(o); }}
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
                      't-body max-w-[85%] whitespace-pre-wrap border px-3 py-2',
                      isUser
                        ? 'border-rule-strong bg-sheet-sunk text-ink'
                        : 'border-rule bg-sheet-raised text-ink-2'
                    )}
                  >
                    {msg.parts[0].text}
                  </div>
                </div>
              );
            })}

            {pending && (
              <div className="flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-line/50 bg-line/10" aria-hidden>
                  <Bot className="h-3 w-3 text-line" strokeWidth={1.75} />
                </span>
                <div className="flex items-center border border-rule bg-sheet-raised px-3 py-2.5">
                  <span className="plotting h-[2px] w-16 bg-rule-faint" role="status" aria-label="Assistant is replying" />
                </div>
              </div>
            )}

            {failed && (
              <Note tone="redline">
                The assistant could not be reached. Your question is still in the thread — send it
                again to retry.
              </Note>
            )}

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
            disabled={pending}
            {...register('message', { required: true, minLength: 2 })}
          />
          <Button type="submit" tone="line" size="md" disabled={pending} aria-label="Send">
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
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
