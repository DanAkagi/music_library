import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { updateCheckerLogger as logger } from '../config/logger';
import { QueueMessage, UpdateCheckerPayload } from '../config/types';

dotenv.config();

const MUSIC_PATH = process.env.MUSIC_PATH || '';
const TIME_INTERVAL = parseInt(process.env.TIME_INTERVAL_UPDATE_CHECKER || '5') * 60 * 1000;

// Scan all MP3s currently present in the directory.
// No in-memory tracking: file-suppressor deletes processed files,
// so anything still on disk at the next interval is genuinely pending.
const scanForMp3Files = (): string[] => {
  if (!MUSIC_PATH || !fs.existsSync(MUSIC_PATH)) {
    logger.error(`Music path does not exist or is not set: "${MUSIC_PATH}"`);
    return [];
  }

  return fs
    .readdirSync(MUSIC_PATH)
    .filter((file) => path.extname(file).toLowerCase() === '.mp3')
    .map((file) => path.join(MUSIC_PATH, file));
};

export const runUpdateChecker = async (): Promise<void> => {
  logger.info('--- Update Checker started ---');

  const check = async () => {
    logger.info('Scanning music directory for MP3 files...');

    const files = scanForMp3Files();

    if (files.length === 0) {
      logger.info('No MP3 files found.');
      return;
    }

    logger.info(`Found ${files.length} file(s):`);
    for (const f of files) {
      logger.info(`  [BEGIN] ${path.basename(f)}`);
    }

    const message: QueueMessage<UpdateCheckerPayload> = {
      timestamp: new Date().toISOString(),
      data: { newFiles: files },
    };

    try {
      const channel = await getRabbitMQChannel();
      channel.sendToQueue(QUEUES.META_DATA, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });
      logger.info(`Sent ${files.length} file(s) to meta-data-extractor queue.`);
      for (const f of files) {
        logger.info(`  [DONE] ${path.basename(f)} → queued for metadata extraction`);
      }
    } catch (err) {
      logger.error(`Failed to send to RabbitMQ: ${(err as Error).message}`);
      for (const f of files) {
        logger.error(`  [FAIL] ${path.basename(f)} | reason: RabbitMQ send error`);
      }
    }
  };

  // Run immediately on start, then on interval
  await check();
  setInterval(check, TIME_INTERVAL);
};