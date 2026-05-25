/**
 * Structured Logging Utility
 * Provides consistent, structured logging format for easier debugging and log aggregation
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get current log level from environment
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel as LogLevel] !== undefined) {
    return envLevel as LogLevel;
  }
  // Default to info in production, debug in development
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // JSON format for production log aggregation
    return JSON.stringify(entry);
  }
  // Human-readable format for development
  const timestamp = entry.timestamp.split("T")[1]?.replace("Z", "") || entry.timestamp;
  let log = `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    log += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
  }
  
  if (entry.error) {
    log += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      log += `\n  Stack: ${entry.error.stack}`;
    }
  }
  
  return log;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

// Logger object with methods for each log level
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      const entry = createLogEntry("debug", message, context);
      console.debug(formatLogEntry(entry));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      const entry = createLogEntry("info", message, context);
      console.info(formatLogEntry(entry));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      const entry = createLogEntry("warn", message, context);
      console.warn(formatLogEntry(entry));
    }
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (shouldLog("error")) {
      const entry = createLogEntry("error", message, context, error);
      console.error(formatLogEntry(entry));
    }
  },

  // Convenience method for API routes
  api(endpoint: string, method: string, statusCode: number, duration?: number): void {
    const context = {
      endpoint,
      method,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    };
    
    if (statusCode >= 500) {
      this.error(`API ${method} ${endpoint} failed with ${statusCode}`, undefined, context);
    } else if (statusCode >= 400) {
      this.warn(`API ${method} ${endpoint} returned ${statusCode}`, context);
    } else {
      this.info(`API ${method} ${endpoint} completed`, context);
    }
  },
};

export default logger;
