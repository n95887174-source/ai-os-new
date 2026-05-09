import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', width: '100vw', background: '#0a0a0a', color: 'white',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{ 
            background: 'rgba(239,68,68,0.1)', padding: '2rem', borderRadius: 24, 
            border: '1px solid rgba(239,68,68,0.2)', maxWidth: 500,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Something went wrong</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
              A critical error occurred in the Super-Agents OS interface. The incident has been logged in the kernel logs.
            </p>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 12, 
              fontSize: '0.8rem', color: '#fca5a5', marginBottom: '2rem',
              textAlign: 'left', border: '1px solid rgba(239,68,68,0.1)',
              fontFamily: 'monospace', overflow: 'auto', maxHeight: 100
            }}>
              {this.state.error?.toString()}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                }}
              >
                <RefreshCw size={18} /> Reload
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: 12, border: '1px solid var(--border)',
                  background: 'transparent', color: 'white', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                }}
              >
                <Home size={18} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
