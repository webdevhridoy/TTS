/**
 * Basic structured logger for observability.
 * Extend this to push to Datadog/Axiom in production.
 */
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: "info", message, timestamp: new Date().toISOString(), ...meta }));
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({ level: "warn", message, timestamp: new Date().toISOString(), ...meta }));
  },
  error: (message: string, meta?: any) => {
    console.error(JSON.stringify({ level: "error", message, timestamp: new Date().toISOString(), ...meta }));
  }
};
