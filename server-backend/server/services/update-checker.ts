import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { updateCheckerLogger as logger } from '../config/logger';
import { QueueMessage, UpdateCheckerPayload } from '../config/types';

dotenv.config();

const MUSIC_PATH = process.env.MUSIC_PATH || '';

// TIME_INTERVAL_UPDATE_CHECKER_SECONDS (prioritaire) ou TIME_INTERVAL_UPDATE_CHECKER en minutes
const INTERVAL_SECONDS = parseInt(process.env.TIME_INTERVAL_UPDATE_CHECKER_SECONDS || '', 10);
const TIME_INTERVAL = Number.isFinite(INTERVAL_SECONDS)
  ? INTERVAL_SECONDS * 1000
  : parseInt(process.env.TIME_INTERVAL_UPDATE_CHECKER || '5', 10) * 60 * 1000;
// No in-memory tracking: file-suppressor deletes processed files,
// so anything still on disk at the next interval is genuinely pending.
const scanForMp3Files = (dir: string = MUSIC_PATH): string[] => {
  if (!dir || !fs.existsSync(dir)) {
    if (dir === MUSIC_PATH) {
      logger.error(`Music path does not exist or is not set: "${MUSIC_PATH}"`);
    }
    return [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanForMp3Files(fullPath));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp3') {
      results.push(fullPath);
    }
  }
  return results;
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