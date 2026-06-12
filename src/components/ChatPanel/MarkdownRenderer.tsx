import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CodeRunner, EXECUTABLE_LANGS } from './CodeRunner';

interface MarkdownRendererProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 1500);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 6, padding: '4px 8px',
        color: copied ? '#10b981' : 'var(--text-muted)',
        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', zIndex: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'; }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const MarkdownRendererImpl: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        const highlighted = codeBlockLang ? highlightCode(codeBlockContent, codeBlockLang) : codeBlockContent;
        const isExecutable = codeBlockLang && EXECUTABLE_LANGS.has(codeBlockLang.toLowerCase().replace(/^node/i, 'js').replace(/^javascript/i, 'js').replace(/^typescript/i, 'ts').replace(/^python/i, 'py'));
        elements.push(
          <div key={`code-${i}`} style={{ position: 'relative', margin: '0.5rem 0' }}>
            {codeBlockLang && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {codeBlockLang}
              </div>
            )}
            <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: codeBlockLang ? '0 0 8px 8px' : 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace" }}>
              <code>{highlighted}</code>
            </pre>
            <CopyButton text={codeBlockContent} />
            {isExecutable && <CodeRunner code={codeBlockContent} language={codeBlockLang} />}
          </div>
        );
        codeBlockContent = '';
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      i = j - 1;
      elements.push(parseTable(tableLines, `tbl-${i}`));
      continue;
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      elements.push(<Tag key={`h-${i}`} style={{ margin: '0.75rem 0 0.25rem', fontWeight: 700, fontSize: `${1.6 - level * 0.15}rem` }}>{inlineMarkdown(headerMatch[2])}</Tag>);
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={`li-${i}`} style={{ marginLeft: '1.5rem', lineHeight: 1.7 }}>{inlineMarkdown(line.slice(2))}</li>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={`li-${i}`} style={{ marginLeft: '1.5rem', lineHeight: 1.7 }}>{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>);
      continue;
    }

    if (line.startsWith('> ')) {
      elements.push(<blockquote key={`bq-${i}`} style={{ borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', margin: '0.5rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>{inlineMarkdown(line.slice(2))}</blockquote>);
      continue;
    }

    elements.push(<p key={`p-${i}`} style={{ margin: '0.25rem 0', lineHeight: 1.7 }}>{inlineMarkdown(line)}</p>);
  }

  if (inCodeBlock) {
    const highlighted = codeBlockLang ? highlightCode(codeBlockContent, codeBlockLang) : codeBlockContent;
    const isExecutable = codeBlockLang && EXECUTABLE_LANGS.has(codeBlockLang.toLowerCase().replace(/^node/i, 'js').replace(/^javascript/i, 'js').replace(/^typescript/i, 'ts').replace(/^python/i, 'py'));
    elements.push(
      <div key="code-unclosed" style={{ position: 'relative', margin: '0.5rem 0' }}>
        {codeBlockLang && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {codeBlockLang}
          </div>
        )}
        <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: codeBlockLang ? '0 0 8px 8px' : 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace" }}>
          <code>{highlighted}</code>
        </pre>
        <CopyButton text={codeBlockContent} />
        {isExecutable && <CodeRunner code={codeBlockContent} language={codeBlockLang} />}
      </div>
    );
  }

  return <>{elements}</>;
};

export const MarkdownRenderer = React.memo(MarkdownRendererImpl);

function parseTable(tableLines: string[], key: string): React.ReactNode {
  if (tableLines.length < 2) {
    return <div key={key} style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.25rem 0' }}>{tableLines.join('\n')}</div>;
  }
  const separatorIndex = tableLines.findIndex(l => /^[\s|:-]+$/.test(l) && l.includes('-'));
  const headerLine = separatorIndex === 0 ? null : tableLines[0];
  const bodyStart = separatorIndex >= 0 ? separatorIndex + 1 : 1;
  const bodyLines = tableLines.slice(bodyStart);

  const splitRow = (row: string): string[] =>
    row.split('|').slice(1, -1).map(c => c.trim());

  return (
    <div key={key} style={{ overflowX: 'auto', margin: '0.5rem 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', lineHeight: 1.6 }}>
        {headerLine && (
          <thead>
            <tr>
              {splitRow(headerLine).map((h, i) => (
                <th key={`h-${h}-${i}`} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid rgba(255,255,255,0.15)', fontWeight: 700, color: 'var(--text-main)', background: 'rgba(255,255,255,0.03)' }}>
                  {inlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyLines.filter(l => l.trim()).map((row, ri) => (
            <tr key={`r-${row.slice(0, 24)}-${ri}`}>
              {splitRow(row).map((c, ci) => (
                <td key={`c-${ci}`} style={{ padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {inlineMarkdown(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const HIGHLIGHT_KEYWORDS: Record<string, string[]> = {
  ts: ['abstract','as','async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','enum','export','extends','false','finally','for','from','function','if','implements','import','in','instanceof','interface','let','new','null','of','package','private','protected','public','readonly','return','static','super','switch','this','throw','true','try','type','typeof','undefined','var','void','while','with','yield'],
  js: ['async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','false','finally','for','function','if','import','in','instanceof','let','new','null','of','return','static','super','switch','this','throw','true','try','typeof','undefined','var','void','while','with','yield'],
  python: ['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield'],
  go: ['break','case','chan','const','continue','default','defer','else','fallthrough','for','func','go','goto','if','import','interface','map','package','range','return','select','struct','switch','type','var'],
  rust: ['as','async','await','break','const','continue','crate','dyn','else','enum','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return','self','static','struct','super','trait','true','type','unsafe','use','where','while'],
};

const highlightCache = new Map<string, React.ReactNode>();
const CACHE_MAX = 500;

function highlightCode(code: string, lang: string): React.ReactNode {
  const cacheKey = `${lang}:${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) {
    highlightCache.delete(cacheKey);
    highlightCache.set(cacheKey, cached);
    return cached;
  }

  if (highlightCache.size >= CACHE_MAX) {
    const lruKey = highlightCache.keys().next().value;
    if (lruKey != null) highlightCache.delete(lruKey);
  }
  const langLower = lang.toLowerCase().replace(/^node/i, 'js').replace(/^javascript/i, 'js').replace(/^typescript/i, 'ts');
  const kw = HIGHLIGHT_KEYWORDS[langLower] || HIGHLIGHT_KEYWORDS['ts'];
  const special = ['"', "'", '`', '//', '/*', '*/', '#', '==', '!=', '===', '!==', '=>', '->', '<=', '>='];
  const parts: React.ReactNode[] = [];
  let idx = 0;

  const tokenize = (str: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    const re = /\/\/.*$|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b(\d+\.?\d*)\b|[+\-*/%&|^~<>!=]+|(\b[a-zA-Z_$][\w$]*\b)/gm;
    let m;
    let last = 0;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) {
        tokens.push(str.slice(last, m.index));
        last = m.index;
      }
      const matched = m[0];
      if (matched.startsWith('//') || matched.startsWith('/*') || matched.startsWith('#')) {
        tokens.push(<span key={`comm-${idx++}`} style={{ color: '#6b7280' }}>{matched}</span>);
      } else if (matched.startsWith("'") || matched.startsWith('"') || matched.startsWith('`')) {
        tokens.push(<span key={`str-${idx++}`} style={{ color: '#34d399' }}>{matched}</span>);
      } else if (m[1]) {
        tokens.push(<span key={`num-${idx++}`} style={{ color: '#fbbf24' }}>{matched}</span>);
      } else if (m[2] && kw.includes(m[2])) {
        tokens.push(<span key={`kw-${idx++}`} style={{ color: '#c084fc', fontWeight: 600 }}>{matched}</span>);
      } else {
        tokens.push(matched);
      }
      last = m.index + matched.length;
    }
    if (last < str.length) tokens.push(str.slice(last));
    return tokens;
  };

  const lines = code.split('\n');
  for (const ln of lines) {
    parts.push(<div key={`hl-${idx++}`} style={{ minHeight: '1.2em' }}>{tokenize(ln)}</div>);
  }
  const result = <>{parts}</>;
  highlightCache.set(cacheKey, result);
  return result;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  let idx = 0;

  const inlineRegex = /(`{1,2})([^`]+)\1|!\[([^\]]*)\]\(([^)]+)\)|(\*\*\*?|___?)(.+?)\5|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<code key={`c-${idx++}`} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }}>{match[2]}</code>);
    } else if (match[3]) {
      const imgSrc = match[4];
      try {
        const parsed = new URL(imgSrc);
        if (parsed.protocol === 'https:') {
          parts.push(<img key={`img-${idx++}`} src={imgSrc} alt={match[3]} style={{ maxWidth: '100%', borderRadius: 8, margin: '0.25rem 0' }} loading="lazy" />);
        } else {
          parts.push(<span key={`img-${idx++}`} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[{match[3]}]</span>);
        }
      } catch {
        parts.push(<span key={`img-${idx++}`} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[{match[3]}]</span>);
      }
    } else if (match[5] && match[6]) {
      const delim = match[5];
      const inner = match[6];
      const isBold = delim.length >= 2;
      const isItalic = delim.includes('*') || delim.includes('_');
      const style: React.CSSProperties = {};
      if (isBold) style.fontWeight = 700;
      if (isItalic) style.fontStyle = 'italic';
      parts.push(<span key={`s-${idx++}`} style={style}>{inner}</span>);
    } else if (match[7] && match[8]) {
      const url = match[8];
      try {
        const parsed = new URL(url);
        const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
        if (allowedProtocols.includes(parsed.protocol)) {
          parts.push(<a key={`a-${idx++}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{match[7]}</a>);
        } else {
          parts.push(<span key={`a-${idx++}`} style={{ color: '#60a5fa', textDecoration: 'underline' }}>{match[7]}</span>);
        }
      } catch {
        parts.push(<span key={`a-${idx++}`} style={{ color: '#60a5fa', textDecoration: 'underline' }}>{match[7]}</span>);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
