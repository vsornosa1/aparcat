import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { databaseUrl, resetServerEnvCache, serverEnv } from './env';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  resetServerEnvCache();
});

afterEach(() => {
  process.env = { ...originalEnv };
  resetServerEnvCache();
});

describe('serverEnv', () => {
  it('aplica valores por defecto cuando el entorno no define nada', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.VALENCIA_TRAFFIC_BASE_URL;
    delete process.env.INGEST_USER_AGENT;
    delete process.env.INGEST_TIMEOUT_MS;

    const env = serverEnv();

    expect(env.LOG_LEVEL).toBe('info');
    expect(env.VALENCIA_TRAFFIC_BASE_URL).toContain('geoportal.valencia.es');
    expect(env.INGEST_TIMEOUT_MS).toBe(15_000);
    expect(env.INGEST_USER_AGENT).toContain('parkflow');
  });

  it('falla con un mensaje claro cuando un valor no es válido', () => {
    process.env.LOG_LEVEL = 'verbose';

    expect(() => serverEnv()).toThrow(/Configuración de entorno inválida/);
  });

  it('cachea el resultado entre llamadas', () => {
    const first = serverEnv();
    process.env.LOG_LEVEL = 'debug';

    expect(serverEnv()).toBe(first);
  });
});

describe('databaseUrl', () => {
  it('explica cómo configurarla cuando falta', () => {
    delete process.env.DATABASE_URL;

    expect(() => databaseUrl()).toThrow(/Falta DATABASE_URL/);
  });

  it('devuelve la cadena de conexión configurada', () => {
    process.env.DATABASE_URL = 'postgres://parkflow:parkflow@localhost:5432/parkflow';

    expect(databaseUrl()).toBe('postgres://parkflow:parkflow@localhost:5432/parkflow');
  });
});
