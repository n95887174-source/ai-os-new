import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
        elements.push(<pre key={`code-${i}`} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.5rem 0' }}><code>{codeBlockContent}</code></pre>);
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

    let processed = escapeHtml(line);

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
    elements.push(<pre key="code-unclosed" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '1rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.5rem 0' }}><code>{codeBlockContent}</code></pre>);
  }

  return <>{elements}</>;
};

function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
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
      let style: React.CSSProperties = {};
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
