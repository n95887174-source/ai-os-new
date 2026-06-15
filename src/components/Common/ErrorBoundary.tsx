import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { eventBus } from '../../kernel/events/event-bus';
import { EVENTS } from '../../kernel/events/event-names';
import { rootLogger } from '../../kernel/services/logger-service';

interface Props {
  children: ReactNode;
  name?: string;
  variant?: 'page' | 'panel';
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
    rootLogger.error('ErrorBoundary', error.message, {
      name: this.props.name,
      componentStack: errorInfo.componentStack,
      stack: error.stack,
    });
    eventBus.emit(EVENTS.ERROR_BOUNDARY_CAUGHT, {
      name: this.props.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
      stack: error.stack,
      timestamp: Date.now(),
    });
    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `[ErrorBoundary${this.props.name ? ':' + this.props.name : ''}] ${error.message}`,
      type: 'error'
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.variant === 'panel') {
        return (
          <div className="error-panel" role="alert" aria-live="assertive">
            <AlertTriangle size={32} color="#ef4444" className="error-panel-icon" />
            <p className="error-panel-title">
              {this.props.name || 'Panel'} crashed
            </p>
            <p className="error-panel-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleReset} className="error-reload-btn" aria-label="Reload panel">
              <RefreshCw size={14} /> Reload
            </button>
          </div>
        );
      }

      return (
        <div className="error-page" role="alert" aria-live="assertive">
          <div className="error-page-card">
            <AlertTriangle size={64} color="#ef4444" className="error-page-icon" />
            <h1 className="error-page-heading">Something went wrong</h1>
            <p className="error-page-desc">
              A critical error occurred in the Super-Agents OS interface. The incident has been logged in the kernel logs.
            </p>
            
            <div className="error-page-detail">
              {this.state.error?.toString()}
            </div>

            <div className="error-page-actions">
              <button onClick={this.handleReset} className="error-page-btn">
                <RefreshCw size={18} /> Reload
              </button>
              <button onClick={() => window.location.href = '/'} className="error-page-btn--secondary">
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
