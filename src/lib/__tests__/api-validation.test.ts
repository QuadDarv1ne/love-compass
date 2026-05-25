import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { VALIDATION } from '@/lib/constants';

const sendMessageSchema = z.object({
  matchId: z.string().min(1),
  content: z.string().min(1).max(VALIDATION.MESSAGE_MAX_LENGTH),
});

describe('sendMessageSchema validation', () => {
  it('validates correct input', () => {
    const result = sendMessageSchema.safeParse({ matchId: 'match-1', content: 'Hello!' });
    expect(result.success).toBe(true);
  });

  it('rejects empty matchId', () => {
    const result = sendMessageSchema.safeParse({ matchId: '', content: 'Hello!' });
    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = sendMessageSchema.safeParse({ matchId: 'match-1', content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding max length', () => {
    const longContent = 'a'.repeat(VALIDATION.MESSAGE_MAX_LENGTH + 1);
    const result = sendMessageSchema.safeParse({ matchId: 'match-1', content: longContent });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = sendMessageSchema.safeParse({ matchId: 'match-1' });
    expect(result.success).toBe(false);
  });
});
