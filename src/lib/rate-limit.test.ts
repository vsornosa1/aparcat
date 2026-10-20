import { beforeEach, describe, expect, it } from 'vitest';
import { consumeRateLimit, resetRateLimits } from './rate-limit';

const RULE = { limit: 2, windowMs: 1_000 };

beforeEach(() => {
  resetRateLimits();
});

describe('consumeRateLimit', () => {
  it('permite hasta el límite dentro de la ventana', () => {
    expect(consumeRateLimit('device:1', RULE, 0)).toBe(true);
    expect(consumeRateLimit('device:1', RULE, 500)).toBe(true);
    expect(consumeRateLimit('device:1', RULE, 900)).toBe(false);
  });

  it('reinicia al expirar la ventana', () => {
    consumeRateLimit('device:1', RULE, 0);
    consumeRateLimit('device:1', RULE, 0);

    expect(consumeRateLimit('device:1', RULE, 1_001)).toBe(true);
  });

  it('separa las claves de dispositivo e IP', () => {
    consumeRateLimit('device:1', RULE, 0);
    consumeRateLimit('device:1', RULE, 0);

    expect(consumeRateLimit('device:2', RULE, 0)).toBe(true);
    expect(consumeRateLimit('ip:1', RULE, 0)).toBe(true);
  });

  it('se limpia por completo con resetRateLimits', () => {
    consumeRateLimit('device:1', RULE, 0);
    consumeRateLimit('device:1', RULE, 0);
    resetRateLimits();

    expect(consumeRateLimit('device:1', RULE, 0)).toBe(true);
  });
});
