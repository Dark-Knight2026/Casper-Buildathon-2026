/**
 * Centralized logging utility
 * - In development: logs to console
 * - In production: only errors are logged
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const logger = {
  log: isDevelopment ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: isDevelopment ? console.debug.bind(console) : () => {},
  info: isDevelopment ? console.info.bind(console) : () => {},
};
export default logger;
