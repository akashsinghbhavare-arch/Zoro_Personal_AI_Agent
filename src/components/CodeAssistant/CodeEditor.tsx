// Syntax highlighting code editor component

/* ─── Minimal syntax highlighter ───────────────────────────────────────────
   No external dependencies. Handles JS/TS/Python/JSON/HTML/CSS/Bash/SQL.    */

const LANG_TOKENS: Record<string, { keywords: string[]; color: string }[]> = {
  js: [
    { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'this', 'from', 'of', 'in', 'switch', 'case', 'break', 'continue'], color: '#c084fc' },
  ],
  ts: [
    { keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'this', 'from', 'of', 'in', 'interface', 'type', 'enum', 'extends', 'implements', 'readonly', 'public', 'private', 'protected'], color: '#c084fc' },
  ],
  python: [
    { keywords: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'], color: '#c084fc' },
  ],
};

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenize(code: string, lang: string): string {
  const escaped = escapeHtml(code);
  const tokens = LANG_TOKENS[lang.toLowerCase()] || LANG_TOKENS['js'];

  // String literals
  let result = escaped
    .replace(/(&quot;|&#x27;|`)(.*?)\1/g, '<span style="color:#86efac">$1$2$1</span>')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
    .replace(/(#[^\n]*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>');

  // Keywords
  if (tokens) {
    tokens.forEach(({ keywords, color }) => {
      keywords.forEach(kw => {
        result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span style="color:${color};font-weight:600">$1</span>`);
      });
    });
  }

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fb923c">$1</span>');

  return result;
}

interface CodeEditorProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxLines?: number;
}

export const CodeEditor = ({ code, language = 'text', filename, showLineNumbers = true, maxLines }: CodeEditorProps) => {
  const lines = code.split('\n');
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const isTruncated = maxLines && lines.length > maxLines;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  const highlighted = displayLines.map(line => tokenize(line, language));

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950/80 my-2 text-sm font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-slate-400 text-xs ml-1 uppercase tracking-wider font-semibold">
            {filename || language}
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors"
        >
          Copy
        </button>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {highlighted.map((lineHtml, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02]">
                {showLineNumbers && (
                  <td className="select-none text-slate-600 text-right pr-3 pl-4 py-0 leading-6 min-w-[2.5rem] text-xs border-r border-slate-800 align-top">
                    {idx + 1}
                  </td>
                )}
                <td className="pl-4 pr-4 py-0 leading-6 align-top">
                  <span dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }} />
                </td>
              </tr>
            ))}
            {isTruncated && (
              <tr>
                <td colSpan={2} className="text-center text-slate-500 text-xs py-2 border-t border-slate-800">
                  … {lines.length - (maxLines ?? 0)} more lines
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
