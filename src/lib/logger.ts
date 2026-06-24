/**
 * Simple structured logger for consistent error reporting.
 * Works in both server and client environments.
 */

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  context?: string;
  message: string;
  data?: unknown;
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

export const logger = {
  error(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      context,
      message,
      data: safeParseError(data),
    };
    console.error(formatEntry(entry));
  },

  warn(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      context,
      message,
      data: safeParseError(data),
    };
    console.warn(formatEntry(entry));
  },

  info(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      context,
      message,
      data: safeParseError(data),
    };
    console.info(formatEntry(entry));
  },
};

export const appLogger = logger;
