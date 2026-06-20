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
      data: data instanceof Error ? { message: data.message, stack: data.stack } : data,
    };
    console.error(formatEntry(entry));
  },

  warn(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
    };
    console.warn(formatEntry(entry));
  },

  info(context: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      context,
      message,
      data,
    };
    console.info(formatEntry(entry));
  },
};

export const appLogger = logger;
