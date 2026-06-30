import fs from 'fs';
import path from 'path';
import { getMusicFiles, updateFilepath } from '../config/database';
import { senderApiLogger as logger } from '../config/logger';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import {
  QueueMessage,
  MetaDataPayload,
  FileSuppressorPayload,
  MusicFileMetadata,
} from '../config/types';

// Path where mp3 files are copied (VAULT)
const VAULT_PATH = path.resolve(
  process.env.VAULT || 'public/vault'
);

export const startSenderApi = async (): Promise<void> => {
  logger.info('--- Sender API listening on queue ---');

  // Create VAULT directory if it doesn't exist
  if (!fs.existsSync(VAULT_PATH)) {
    fs.mkdirSync(VAULT_PATH, { recursive: true });
  }

  const channel = await getRabbitMQChannel();
  channel.prefetch(1);

  channel.consume(QUEUES.SENDER_API, async (msg) => {
    if (!msg) return;

    let payload: QueueMessage<MetaDataPayload>;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      logger.error('Failed to parse message from meta-data-extractor queue.');
      channel.nack(msg, false, false);
      return;
    }

    const { files } = payload.data;
    logger.info(`Received ${files.length} file(s) to process.`);

    const processedFiles: string[] = [];

    for (const meta of files) {
      logger.info(`  [BEGIN] Processing: ${meta.filename}`);
      try {
        // Copy mp3 to VAULT
        const destPath = path.join(VAULT_PATH, meta.filename);
        
        if (meta.filepath && fs.existsSync(meta.filepath)) {
          fs.copyFileSync(meta.filepath, destPath);
          logger.info(`  [IN PROGRESS] ${meta.filename} → copied to VAULT`);
          
          // Update filepath in database
          await updateFilepath(meta.filename, destPath);
          logger.info(`  [IN PROGRESS] ${meta.filename} → filepath updated in database`);
          
          processedFiles.push(meta.filepath);
          logger.info(`  [DONE] ${meta.filename} → processed`);
        } else {
          logger.warn(`  [SKIP] ${meta.filename} → source file not found or filepath null`);
        }
      } catch (err) {
        logger.error(`  [FAIL] ${meta.filename} | reason: ${(err as Error).message}`);
      }
    }

    const outMessage: QueueMessage<FileSuppressorPayload> = {
      timestamp: new Date().toISOString(),
      data: { processedFiles },
    };

    try {
      channel.sendToQueue(QUEUES.FILE_SUPPRESSOR, Buffer.from(JSON.stringify(outMessage)), {
        persistent: true,
      });
      logger.info(`Forwarded ${processedFiles.length} processed file(s) to file-suppressor queue.`);
    } catch (err) {
      logger.error(`Failed to forward to file-suppressor: ${(err as Error).message}`);
    }

    channel.ack(msg);
  });
};
