import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Terminal, X, AlertTriangle, Copy } from 'lucide-react';

const EXECUTABLE_LANGS = new Set(['js', 'javascript', 'ts', 'typescript', 'python', 'py', 'html', 'css']);

/**
 * Escape characters that could break out of <script> / <style> / <iframe srcdoc>
 * contexts.  Used before embedding user-supplied (LLM-generated) HTML/CSS/JS
 * into a sandboxed iframe via srcdoc.
 */
function escapeForSrcdoc(s: string): string {
  return s
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<!--/g, '<\\!--')
    .replace(/\/\*>/g, '\\*\\/');
}

/** Escape a CSS fragment so it cannot terminate its own <style> block. */
function escapeForStyle(s: string): string {
  return s.replace(/<\/(style)/gi, '<\\/$1');
}

interface CodeRunnerProps {
  code: string;
  language: string;
}

export const CodeRunner: React.FC<CodeRunnerProps> = ({ code, language }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * Cleanup helper.  Removes the sandbox iframe and any associated message
   * listener; called from runCode(), the result/error paths, the timeout
   * path, and (on unmount) the effect below.  Without this the iframe leaks
   * if the user navigates away mid-execution.
   */
  const cleanup = useCallback(() => {
    if (iframeRef.current) {
      try { document.body.removeChild(iframeRef.current); } catch {}
      iframeRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const normalizeLang = (lang: string): string => {
    const l = lang.toLowerCase().replace(/^node/i, 'js').replace(/^javascript/i, 'js').replace(/^typescript/i, 'ts').replace(/^python/i, 'py');
    return l;
  };

  const runCode = useCallback(() => {
    setIsRunning(true);
    setError(null);
    setOutput(null);
    setShowOutput(true);

    const normLang = normalizeLang(language);

    if (normLang === 'html') {
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-scripts');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(escapeForSrcdoc(code));
        doc.close();
        setTimeout(() => {
          try {
            const bodyText = doc.body?.innerText || '(no output)';
            setOutput(bodyText.slice(0, 5000));
          } catch {
            setOutput('(rendered — check iframe for visual output)');
          }
          setIsRunning(false);
        }, 1000);
      } else {
        setError('Failed to create sandbox');
        setIsRunning(false);
      }
      return;
    }

    if (normLang === 'css') {
      setOutput('CSS applied to sandbox (visual output in iframe)');
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-scripts');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<html><head><style>${escapeForStyle(code)}</style></head><body><div class="test">Preview</div></body></html>`);
        doc.close();
      }
      setIsRunning(false);
      return;
    }

    // JS/TS/Python: use iframe with console capture
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    const logs: string[] = [];
    const maxLogs = 200;
    const expectedOrigin = window.location.origin;

    const listener = (e: MessageEvent) => {
      // Security: only accept messages from our sandbox iframe (same origin
      // since allow-same-origin is NOT set, origin is "null" in modern
      // browsers; we accept either that or our own origin to cover both
      // browser behaviors).
      if (e.source !== iframe.contentWindow) return;
      const isOwnOrigin = e.origin === expectedOrigin;
      const isNullOrigin = e.origin === 'null';
      if (!isOwnOrigin && !isNullOrigin) return;

      if (e.data?.type === 'sandbox-log') {
        logs.push(e.data.args?.join(' ') || String(e.data.args));
        if (logs.length > maxLogs) logs.length = maxLogs;
      } else if (e.data?.type === 'sandbox-result') {
        setOutput(logs.join('\n') || '(no output)');
        setIsRunning(false);
        window.removeEventListener('message', listener);
        setTimeout(cleanup, 100);
      } else if (e.data?.type === 'sandbox-error') {
        setError(e.data.message || 'Execution failed');
        setOutput(logs.join('\n') || '(no output before error)');
        setIsRunning(false);
        window.removeEventListener('message', listener);
        setTimeout(cleanup, 100);
      }
    };
    window.addEventListener('message', listener);

    const timeout = setTimeout(() => {
      setError('Execution timed out (10s limit)');
      setOutput(logs.join('\n') || '(no output)');
      setIsRunning(false);
      window.removeEventListener('message', listener);
      cleanup();
    }, 10000);

    const safeCode = escapeForSrcdoc(code);
    const sandboxHtml = `<!DOCTYPE html>
<html>
<head><script>
const _origConsole = { ...console };
['log','warn','error','info'].forEach(m => {
  console[m] = (...args) => {
    try { parent.postMessage({ type: 'sandbox-log', method: m, args: args.map(a => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch { return String(a); } }
      return String(a);
    })}, '*'); } catch {}
    try { _origConsole[m](...args); } catch {}
  };
});
window.onerror = (msg, src, line, col, err) => {
  try { parent.postMessage({ type: 'sandbox-error', message: msg + ' (line ' + line + ')' }, '*'); } catch {}
};
window.addEventListener('unhandledrejection', (e) => {
  try { parent.postMessage({ type: 'sandbox-error', message: 'Unhandled: ' + (e.reason?.message || e.reason) }, '*'); } catch {}
});
</script></head>
<body>
<script>
try {
  ${normLang === 'py' || normLang === 'python' ? `
    parent.postMessage({ type: 'sandbox-result' }, '*');
  ` : `
    (async function() {
      ${safeCode}
      parent.postMessage({ type: 'sandbox-result' }, '*');
    })();
  `}
} catch(e) {
  parent.postMessage({ type: 'sandbox-error', message: e.message }, '*');
}
</script>
</body>
</html>`;

    iframe.srcdoc = sandboxHtml;
  }, [code, language, cleanup]);

  const closeOutput = useCallback(() => {
    setShowOutput(false);
    setOutput(null);
    setError(null);
    cleanup();
  }, [cleanup]);

  if (!EXECUTABLE_LANGS.has(normalizeLang(language))) return null;

  return (
    <>
      <button
        onClick={runCode}
        disabled={isRunning}
        style={{
          position: 'absolute', top: 8, right: 56,
          background: isRunning ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.4)',
          borderRadius: 6, padding: '4px 10px',
          color: '#60a5fa', fontSize: '0.65rem', fontWeight: 700,
          cursor: isRunning ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.2s', zIndex: 1,
        }}
        onMouseEnter={e => { if (!isRunning) e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
        onMouseLeave={e => { if (!isRunning) e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
        title={`Run ${language} code in sandbox`}
      >
        {isRunning ? <><Terminal size={10} className="spinning" /> Running...</> : <><Play size={10} /> Run</>}
      </button>

      {showOutput && (
        <div style={{ margin: '0.5rem 0', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.6rem', background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.2)' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Terminal size={10} /> Output
              {isRunning && <span style={{ animation: 'pulse 1s infinite' }}>...</span>}
            </span>
            <button onClick={closeOutput} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}>
              <X size={12} />
            </button>
          </div>
          <pre style={{ margin: 0, padding: '0.6rem', background: 'rgba(0,0,0,0.4)', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: error ? '#fca5a5' : '#e2e8f0', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error && <span style={{ color: '#ef4444' }}>Error: {error}</span>}
            {output && !error && output}
            {!output && !error && isRunning && <span style={{ color: '#64748b' }}>Executing...</span>}
          </pre>
        </div>
      )}
    </>
  );
};

export { EXECUTABLE_LANGS };
