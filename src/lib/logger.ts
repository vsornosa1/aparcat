import { pino } from 'pino';
import { serverEnv } from './env';

export const logger = pino({
  level: serverEnv().LOG_LEVEL,
  base: { service: 'parkflow' },
});
