import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const LOG_PATH = process.env.LOG_PATH || 'public/logs/';

const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      })
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(LOG_PATH, `${serviceName}.log`),
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
      }),
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
