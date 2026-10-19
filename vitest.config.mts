import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup/load-env.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/ingest/sources/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts', 'src/lib/logger.ts'],
      thresholds: {
        'src/domain/**/*.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 85,
        },
        'src/ingest/sources/**/*.ts': {
          lines: 85,
          functions: 85,
          statements: 85,
          branches: 75,
        },
      },
    },
  },
});
