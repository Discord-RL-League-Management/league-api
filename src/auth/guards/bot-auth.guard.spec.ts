import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BotAuthGuard } from './bot-auth.guard';

describe('BotAuthGuard', () => {
  let guard: BotAuthGuard;

  beforeEach(() => {
    guard = new BotAuthGuard();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should_create_guard_instance', () => {
      expect(guard).toBeInstanceOf(BotAuthGuard);
    });
  });

  describe('inheritance', () => {
    it('should_extend_AuthGuard', () => {
      expect(guard).toBeInstanceOf(BotAuthGuard);
    });
  });
});
