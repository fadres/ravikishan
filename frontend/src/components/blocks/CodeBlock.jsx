import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';

// Language map: database values → Prism languages.
const LANG_MAP = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  json: 'json',
  html: 'markup',
  xml: 'markup',
  css: 'css',
  sql: 'sql',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  csharp: 'csharp',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  jsx: 'jsx',
  tsx: 'tsx',
};

export default function CodeBlock({ code, language, title }) {
  const [copied, setCopied] = useState(false);
  const lang = LANG_MAP[(language || '').toLowerCase()] || 'text';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/12 bg-[#0a1428] my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </span>
          {title && <span className="text-xs text-slate-300 font-medium ml-2 truncate">{title}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{language || 'text'}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 text-slate-200 hover:bg-white/20 transition"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#34d399" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <Highlight theme={themes.oceanicNext} code={code.trimEnd()} language={lang}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} p-4 overflow-x-auto text-[13px] leading-relaxed`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="inline-block w-7 text-right pr-3 select-none opacity-35">{i + 1}</span>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
