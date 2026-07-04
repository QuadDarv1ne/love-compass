type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  context?: string;
  message: string;
  data?: unknown;
}

const IS_DEV = process.env.NODE_ENV !== 'production';

const LEVEL_PRIORITY: Record<LogLevel, number> = { error: 0, warn: 1, info: 2 };

function shouldLog(level: LogLevel): boolean {
  return IS_DEV ? true : LEVEL_PRIORITY[level] <= LEVEL_PRIORITY.warn;
}

function safeParseError(data: unknown): unknown {
  if (data instanceof Error) {
    return { message: data.message, stack: data.stack };
  }
  return data;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, context: string, message: string, data?: unknown) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    context,
    message,
    data: safeParseError(data),
  };
  const formatted = formatEntry(entry);
  switch (level) {
    case 'error': console.error(formatted); break;
    case 'warn': console.warn(formatted); break;
    case 'info': console.info(formatted); break;
  }
}

function createLogger() {
  return {
    error: (context: string, message: string, data?: unknown) => log('error', context, message, data),
    warn: (context: string, message: string, data?: unknown) => log('warn', context, message, data),
    info: (context: string, message: string, data?: unknown) => log('info', context, message, data),
  };
}

export const logger = createLogger();
