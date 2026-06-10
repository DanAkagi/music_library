import fs from 'fs';
import path from 'path';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { fileSuppressorLogger as logger } from '../config/logger';
import { QueueMessage, FileSuppressorPayload } from '../config/types';

export const startFileSuppressor = async (): Promise<void> => {
  logger.info('--- File Suppressor listening on queue ---');

  const channel = await getRabbitMQChannel();
  channel.prefetch(1);

  channel.consume(QUEUES.FILE_SUPPRESSOR, async (msg) => {
    if (!msg) return;

    let payload: QueueMessage<FileSuppressorPayload>;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      logger.error('Failed to parse message from sender-api queue.');
      channel.nack(msg, false, false);
      return;
    }

    const { processedFiles } = payload.data;
    logger.info(`Received ${processedFiles.length} file(s) to delete from source directory.`);

    for (const filepath of processedFiles) {
      const filename = path.basename(filepath);
      logger.info(`  [BEGIN] Deleting: ${filename}`);
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          logger.info(`  [DONE] ${filename} → deleted from source`);
        } else {
          logger.warn(`  [SKIP] ${filename} not found at path, already deleted?`);
        }
      } catch (err) {
        logger.error(`  [FAIL] ${filename} | reason: ${(err as Error).message}`);
      }
    }

    channel.ack(msg);
    logger.info('File suppression cycle complete.');
  });
};
