import fs from 'fs';
import path from 'path';

// Define levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ANSI color escape sequences
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const levelColors = {
  debug: colors.gray,
  info: colors.green,
  warn: colors.yellow,
  error: colors.red,
};

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
let fileLoggingEnabled = true;

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err: any) {
  fileLoggingEnabled = false;
  console.warn(`[Logger] File logging disabled (cannot write to logs directory): ${err.message}`);
}

/**
 * Returns current daily log file path (logs/app-YYYY-MM-DD.log)
 */
const getLogFilePath = (): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `app-${dateStr}.log`);
};

/**
 * Helper to write string to log file asynchronously
 */
const writeToFile = (logLine: string) => {
  if (!fileLoggingEnabled || process.env.DISABLE_FILE_LOGGING === 'true') {
    return;
  }

  const filePath = getLogFilePath();
  fs.appendFile(filePath, logLine + '\n', 'utf8', (err) => {
    if (err) {
      // Gracefully disable file logging on EROFS (Read-only filesystem) or EACCES (Permissions)
      if ((err as any).code === 'EROFS' || (err as any).code === 'EACCES') {
        fileLoggingEnabled = false;
        console.warn(`[Logger] File logging disabled due to filesystem restrictions (e.g. read-only): ${err.message}`);
      } else {
        console.error(`[Logger] Failed to write log to file: ${err.message}`);
      }
    }
  });
};

/**
 * Utility to serialize errors (since JSON.stringify ignores non-enumerable properties like message and stack)
 */
export const serializeError = (err: any): any => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err as any),
    };
  }
  if (err && typeof err === 'object') {
    const serialized: any = {};
    for (const key of Object.keys(err)) {
      const val = err[key];
      if (val instanceof Error) {
        serialized[key] = serializeError(val);
      } else if (typeof val === 'object' && val !== null) {
        serialized[key] = serializeError(val);
      } else {
        serialized[key] = val;
      }
    }
    return serialized;
  }
  return err;
};

/**
 * Scans the logs directory and purges files older than 14 days.
 * Runs asynchronously on module startup.
 */
const cleanupOldLogs = () => {
  if (!fileLoggingEnabled || process.env.DISABLE_FILE_LOGGING === 'true') {
    return;
  }

  fs.readdir(logsDir, (err, files) => {
    if (err) return;

    const retentionDays = 14;
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      if (!file.startsWith('app-') || !file.endsWith('.log')) {
        return;
      }

      const datePart = file.slice(4, 14); // app-YYYY-MM-DD.log -> YYYY-MM-DD
      const logTime = Date.parse(datePart);

      if (!isNaN(logTime) && now - logTime > retentionMs) {
        const filePath = path.join(logsDir, file);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`[Logger] Failed to delete old log file ${file}: ${unlinkErr.message}`);
          } else {
            console.log(`[Logger] Purged old log file: ${file}`);
          }
        });
      }
    });
  });
};

// Run cleanup asynchronously on load
setTimeout(cleanupOldLogs, 1000);

export class Logger {
  constructor(private context?: { requestId?: string }) {}

  private formatMessage(level: LogLevel, message: string, meta?: any): { consoleStr: string; jsonStr: string } {
    const timestamp = new Date().toISOString();
    const reqId = this.context?.requestId || '';

    // Handle error serialization inside metadata if present
    const cleanMeta = meta ? serializeError(meta) : undefined;

    // Structured JSON Format (used in Production console & all files)
    const jsonObject: any = {
      timestamp,
      level,
      message,
    };
    if (reqId) {
      jsonObject.requestId = reqId;
    }
    if (cleanMeta !== undefined) {
      jsonObject.meta = cleanMeta;
    }
    const jsonStr = JSON.stringify(jsonObject);

    // Development Console format (colorized, human-readable)
    const levelColor = levelColors[level] || colors.reset;
    const levelStr = `${levelColor}${level.toUpperCase().padEnd(5)}${colors.reset}`;
    const timeStr = `${colors.gray}[${timestamp}]${colors.reset}`;
    const reqIdStr = reqId ? `${colors.magenta}[${reqId}]${colors.reset}` : '';

    let metaStr = '';
    if (cleanMeta !== undefined) {
      try {
        metaStr = ` ${colors.gray}${JSON.stringify(cleanMeta)}${colors.reset}`;
      } catch (err) {
        metaStr = ` [Metadata formatting error]`;
      }
    }

    const consoleStr = `${timeStr} ${levelStr} ${reqIdStr} ${message}${metaStr}`;
    return { consoleStr, jsonStr };
  }

  private log(level: LogLevel, message: string, meta?: any) {
    const isProduction = process.env.NODE_ENV === 'production';
    const { consoleStr, jsonStr } = this.formatMessage(level, message, meta);

    // Console output
    if (isProduction) {
      console.log(jsonStr);
    } else {
      console.log(consoleStr);
    }

    // Write to rotating file
    writeToFile(jsonStr);
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }
}

// Default export is a global app-level logger
export const logger = new Logger();
