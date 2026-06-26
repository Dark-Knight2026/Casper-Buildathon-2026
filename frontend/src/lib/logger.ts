/**
 * Backwards-compatibility shim — canonical logger lives at '@/utils/logger'.
 * Import from '@/utils/logger' directly in new code.
 *
 * 'log' is aliased to 'debug' (suppressed in production builds via import.meta.env.DEV).
 */
import { logger as canonical } from '@/utils/logger';

const logger = {
  log:   canonical.debug.bind(canonical),
  debug: canonical.debug.bind(canonical),
  info:  canonical.info.bind(canonical),
  warn:  canonical.warn.bind(canonical),
  error: canonical.error.bind(canonical),
};

export default logger;
