import { existsSync } from 'node:fs';

/**
 * Carga `.env.local` en el proceso. Next.js lo hace por su cuenta; los scripts de
 * Node y las pruebas de integración necesitan este empujón.
 */
export function loadLocalEnvFile(): void {
  if (existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
}
