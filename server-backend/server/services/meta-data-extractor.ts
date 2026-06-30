import path from 'path';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { metaDataLogger as logger } from '../config/logger';
import {
  QueueMessage,
  UpdateCheckerPayload,
  MetaDataPayload,
  MusicFileMetadata,
} from '../config/types';
import { extractMetadataFromPath } from './metadata-extractor';
import { normalizeMetadata } from './metadata-normalizer';

const extractMetadata = async (filepath: string): Promise<MusicFileMetadata> => {
  const filename = path.basename(filepath);
  try {
    return await extractMetadataFromPath(filepath);
  } catch (err) {
    logger.warn(`Could not parse metadata for "${filename}": ${(err as Error).message}`);
    return normalizeMetadata({ filename, filepath });
  }
};

export const startMetaDataExtractor = async (): Promise<void> => {
  logger.info('--- Meta-Data Extractor listening on queue ---');

  const channel = await getRabbitMQChannel();
  channel.prefetch(1);

  channel.consume(QUEUES.META_DATA, async (msg) => {
    if (!msg) return;

    let payload: QueueMessage<UpdateCheckerPayload>;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      logger.error('Failed to parse message from update-checker queue.');
      channel.nack(msg, false, false);
      return;
    }

    const { newFiles } = payload.data;
    logger.info(`Received ${newFiles.length} file(s) to extract metadata from.`);

    const files: MusicFileMetadata[] = [];

    for (const filepath of newFiles) {
      logger.info(`  [BEGIN] Extracting metadata: ${path.basename(filepath)}`);
      try {
        files.push(await extractMetadata(filepath));
        logger.info(`  [DONE] ${path.basename(filepath)} → metadata extracted`);
      } catch (err) {
        logger.error(`  [FAIL] ${path.basename(filepath)} | reason: ${(err as Error).message}`);
      }
    }

    const outMessage: QueueMessage<MetaDataPayload> = {
      timestamp: new Date().toISOString(),
      data: { files },
    };

    try {
      channel.sendToQueue(QUEUES.SENDER_API, Buffer.from(JSON.stringify(outMessage)), {
        persistent: true,
      });
      logger.info(`Sent ${files.length} file(s) metadata to sender-api queue.`);
    } catch (err) {
      logger.error(`Failed to forward to sender-api: ${(err as Error).message}`);
    }

    channel.ack(msg);
  });
};
