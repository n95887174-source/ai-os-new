import React, { useState, useCallback } from 'react';

interface MarkdownRendererProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        const escaped = codeBlockContent;
        elements.push(
          <div key={`code-${i}`} style={{ position: 'relative', margin: '0.5rem 0' }}>
            {codeBlockLang && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {codeBlockLang}
              </div>
            )}
            <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: codeBlockLang ? '0 0 8px 8px' : 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              <code>{escaped}</code>
            </pre>
            <CopyButton text={codeBlockContent} />
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
      codeBlockContent += (codeBlockContent ? '\n' : '') + escapeHtml(line);
      continue;
    }

    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    const processed = escapeHtml(line);

    const headerMatch = processed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = inlineMarkdown(headerMatch[2]);
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      elements.push(<Tag key={`h-${i}`} style={{ margin: '0.75rem 0 0.25rem', fontWeight: 700, fontSize: `${1.6 - level * 0.15}rem` }}>{text}</Tag>);
      continue;
    }

    if (processed.startsWith('- ') || processed.startsWith('* ')) {
      elements.push(<li key={`li-${i}`} style={{ marginLeft: '1.5rem', lineHeight: 1.7 }}>{inlineMarkdown(processed.slice(2))}</li>);
      continue;
    }

    if (/^\d+\.\s/.test(processed)) {
      elements.push(<li key={`li-${i}`} style={{ marginLeft: '1.5rem', lineHeight: 1.7 }}>{inlineMarkdown(processed.replace(/^\d+\.\s/, ''))}</li>);
      continue;
    }

    if (processed.startsWith('> ')) {
      elements.push(<blockquote key={`bq-${i}`} style={{ borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', margin: '0.5rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>{inlineMarkdown(processed.slice(2))}</blockquote>);
      continue;
    }

    if (processed.startsWith('|')) {
      elements.push(<div key={`tbl-${i}`} style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.25rem 0' }}>{processed}</div>);
      continue;
    }

    elements.push(<p key={`p-${i}`} style={{ margin: '0.25rem 0', lineHeight: 1.7 }}>{inlineMarkdown(processed)}</p>);
  }

  if (inCodeBlock) {
    elements.push(
      <div key="code-unclosed" style={{ position: 'relative', margin: '0.5rem 0' }}>
        {codeBlockLang && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {codeBlockLang}
          </div>
        )}
        <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: codeBlockLang ? '0 0 8px 8px' : 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
          <code>{codeBlockContent}</code>
        </pre>
        <CopyButton text={codeBlockContent} />
      </div>
    );
  }

  return <>{elements}</>;
};

function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  let idx = 0;

  const inlineRegex = /(`{1,2})([^`]+)\1|(\*\*\*?|___?)(.+?)\3|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<code key={`c-${idx++}`} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }}>{match[2]}</code>);
    } else if (match[3] && match[4]) {
      const delim = match[3];
      const inner = match[4];
      const isBold = delim.length >= 2;
      const isItalic = delim.includes('*') || delim.includes('_');
      const style: React.CSSProperties = {};
      if (isBold) style.fontWeight = 700;
      if (isItalic) style.fontStyle = 'italic';
      parts.push(<span key={`s-${idx++}`} style={style}>{inner}</span>);
    } else if (match[5] && match[6]) {
      parts.push(<a key={`a-${idx++}`} href={match[6]} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{match[5]}</a>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
