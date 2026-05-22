/**
 * Simple structured logger for server-side API routes.
 * Provides consistent error logging with route context.
 */

export const logger = {
  error(route: string, message: string, error?: unknown) {
    const timestamp = new Date().toISOString();
    const entry = {
      level: 'error',
      timestamp,
      route,
      message,
    };

    if (error instanceof Error) {
      console.error(JSON.stringify({ ...entry, error: error.message, stack: error.stack }));
    } else if (error !== undefined) {
      console.error(JSON.stringify({ ...entry, error: String(error) }));
    } else {
      console.error(JSON.stringify(entry));
    }
  },
};
