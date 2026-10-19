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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/ingest/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts', 'src/ingest/run.ts'],
      thresholds: {
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
