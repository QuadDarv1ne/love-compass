import { logger } from '@/lib/logger';

type Listener = (data: unknown) => void;

interface PubSub {
  subscribe(event: string, listener: Listener): () => void;
  publish(event: string, data: unknown): void;
}

function createPubSub(): PubSub {
  const listeners = new Map<string, Set<Listener>>();

  return {
    subscribe(event: string, listener: Listener): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
      return () => {
        const set = listeners.get(event);
        if (set) {
          set.delete(listener);
          if (set.size === 0) listeners.delete(event);
        }
      };
    },

    publish(event: string, data: unknown): void {
      const set = listeners.get(event);
      if (!set || set.size === 0) return;
      logger.info('sse.publish', `Publishing event: ${event}`, { data });
      set.forEach((listener) => {
        try {
          listener(data);
        } catch {
          // Individual listener errors should not break other listeners
        }
      });
    },
  };
}

export const messageBus = createPubSub();
