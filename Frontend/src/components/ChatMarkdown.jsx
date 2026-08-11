import { memo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';
import { cn } from '../design/cn';

const LANGUAGE_LABEL = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  json: 'JSON',
  bash: 'Shell',
  sh: 'Shell',
  text: 'Code',
};

const toText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node.props) return toText(node.props.children);
  return '';
};

function CodeBlock({ language, source, children }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [source]);

  return (
    <figure className="my-2.5 border border-rule bg-sheet-sunk">
      <figcaption className="flex items-center justify-between border-b border-rule-faint px-2.5 py-1.5">
        <span className="t-micro text-ink-3">
          {LANGUAGE_LABEL[language] ?? language}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex items-center gap-1 text-ink-3 transition-colors hover:text-ink"
        >
          {copied
            ? <Check className="h-3 w-3 text-approved" strokeWidth={2} aria-hidden />
            : <Copy className="h-3 w-3" strokeWidth={2} aria-hidden />}
          <span className="t-micro">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </figcaption>
      <pre className="overflow-x-auto px-2.5 py-2">{children}</pre>
    </figure>
  );
}

const COMPONENTS = {
  pre({ children }) {
    const code = Array.isArray(children) ? children[0] : children;
    const className = code?.props?.className ?? '';
    const language = /language-([\w+-]+)/.exec(className)?.[1] ?? 'text';
    return (
      <CodeBlock language={language} source={toText(code?.props?.children)}>
        {code}
      </CodeBlock>
    );
  },

  code({ className, children, ...props }) {
    const isBlock = /language-|hljs/.test(className ?? '');
    if (isBlock) {
      return <code className={cn(className, 't-data')} {...props}>{children}</code>;
    }
    return (
      <code
        className="t-data border border-rule-faint bg-sheet-sunk px-1 py-px text-ink"
        {...props}
      >
        {children}
      </code>
    );
  },

  h1: ({ children }) => <h3 className="t-h3 mt-3 mb-1.5 text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="t-h3 mt-3 mb-1.5 text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="t-h3 mt-3 mb-1.5 text-ink first:mt-0">{children}</h3>,

  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  ul: ({ children }) => <ul className="my-1.5 flex list-disc flex-col gap-0.5 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 flex list-decimal flex-col gap-0.5 pl-4">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5 marker:text-ink-3">{children}</li>,

  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-line underline underline-offset-2 hover:text-brand-hi"
    >
      {children}
    </a>
  ),

  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-rule-strong pl-2.5 text-ink-3">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-3 border-0 border-t border-rule-faint" />,

  table: ({ children }) => (
    <div className="my-2 overflow-x-auto border border-rule">
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="t-micro border-b border-rule bg-sheet-sunk px-2 py-1.5 text-left text-ink-3">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-rule-faint px-2 py-1.5 align-top">{children}</td>
  ),
};

function ChatMarkdown({ children }) {
  return (
    <div className="chat-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(ChatMarkdown);
