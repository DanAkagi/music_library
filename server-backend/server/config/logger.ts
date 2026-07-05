import winston from 'winston';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const LOG_PATH = process.env.LOG_PATH || 'public/logs/';

const ensureLogDir = (): void => {
  if (!fs.existsSync(LOG_PATH)) {
    fs.mkdirSync(LOG_PATH, { recursive: true });
  }
};

const createLogger = (serviceName: string) => {
  ensureLogDir();
  const filename = path.join(LOG_PATH, `${serviceName}.log`);

  const fileTransport = new winston.transports.File({
    filename,
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    options: { flags: 'a' },
  });

  fileTransport.on('error', (err) => {
    console.error(`[logger:${serviceName}] cannot write to ${filename}: ${err.message}`);
  });

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      })
    ),
    transports: [
      fileTransport,
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${serviceName}] [${level}] ${message}`;
          })
        ),
      }),
    ],
  });
};

export const updateCheckerLogger = createLogger('update-checker');
export const metaDataLogger = createLogger('meta-data-extractor');
export const senderApiLogger = createLogger('sender-api');
export const fileSuppressorLogger = createLogger('file-suppressor');
