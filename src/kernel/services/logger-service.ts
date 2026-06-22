import { CONFIG } from './config-registry';
import type { ILogger, LogEntry, LogLevel, ITraceContext } from '../contracts/logger';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

type LoggerState = {
  buffer: LogEntry[];
  currentTrace?: ITraceContext;
  seq: number;
};

export class LoggerService implements ILogger {
  private state: LoggerState;
  private readonly maxBuffer = CONFIG?.services?.logger?.maxBuffer ?? 500;
  private readonly minLevel: number;
  private readonly minLevelName: LogLevel;

  constructor(_service: string = 'system', minLevel: LogLevel = 'info', state?: LoggerState) {
    this.minLevel = LEVELS[minLevel];
    this.minLevelName = minLevel;
    this.state = state ?? { buffer: [], seq: 0 };
  }

  setTraceContext(tc?: ITraceContext) { this.state.currentTrace = tc; }

  child(service: string): ILogger {
    return new LoggerService(service, this.minLevelName, this.state);
  }

  debug(service: string, message: string, meta?: Record<string, unknown>): void {
    this.log('debug', service, message, meta);
  }

  info(service: string, message: string, meta?: Record<string, unknown>): void {
    this.log('info', service, message, meta);
  }

  warn(service: string, message: string, meta?: Record<string, unknown>): void {
    this.log('warn', service, message, meta);
  }

  error(service: string, message: string, meta?: Record<string, unknown>): void {
    this.log('error', service, message, meta);
  }

  private log(level: LogLevel, service: string, message: string, meta?: Record<string, unknown>): void {
    if (LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      service,
      timestamp: Date.now(),
      seq: this.state.seq++,
      traceId: this.state.currentTrace?.traceId ?? meta?.traceId as string | undefined,
      correlationId: this.state.currentTrace?.correlationId ?? meta?.correlationId as string | undefined,
      meta,
    };

    this.state.buffer.push(entry);
    if (this.state.buffer.length > this.maxBuffer) this.state.buffer.shift();

    switch (level) {
      case 'error': console.error(formatLog(entry)); break;
      case 'warn':  console.warn(formatLog(entry));  break;
      default:      console.log(formatLog(entry));   break;
    }
  }

  getBuffer(): ReadonlyArray<LogEntry> {
    return this.state.buffer;
  }

  query(filter?: Partial<{ service: string; level: LogLevel; traceId: string }>): LogEntry[] {
    let result = this.state.buffer;
    if (filter?.service) result = result.filter(e => e.service === filter.service);
    if (filter?.level) result = result.filter(e => e.level === filter.level);
    if (filter?.traceId) result = result.filter(e => e.traceId === filter.traceId);
    return result;
  }

  clear(): void { this.state.buffer.length = 0; }
}

function formatLog(entry: LogEntry): string {
  const ts = new Date(entry.timestamp).toISOString().slice(11, 23);
  const trace = entry.traceId ? ` [${entry.traceId.slice(0, 8)}]` : '';
  const extra = entry.action ? ` ${entry.action}` : '';
  let error = '';
  if (entry.error instanceof Error) {
    error = `: ${entry.error.message}`;
    if (entry.level === 'error') error += `\n${entry.error.stack}`;
  } else if (entry.error) {
    error = `: ${String(entry.error).slice(0, 120)}`;
  }
  return `[${ts}] ${entry.level.toUpperCase().padEnd(5)} [${entry.service}]${trace}${extra} ${entry.message}${error}`;
}

export const rootLogger = new LoggerService('System', (CONFIG?.services?.logger?.level as LogLevel) ?? 'info');

/**
 * Runtime log level configuration.
 * Call `setLogLevel('debug')` from Settings to change verbosity.
 */
export function setLogLevel(level: LogLevel): void {
  (rootLogger as unknown as { minLevel: number; minLevelName: LogLevel }).minLevel = LEVELS[level];
  (rootLogger as unknown as { minLevelName: LogLevel }).minLevelName = level;
}

