import path from 'path';
import { parseFile } from 'music-metadata';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { metaDataLogger as logger } from '../config/logger';
import { saveMetadata } from '../config/database';
import {
  QueueMessage,
  UpdateCheckerPayload,
  MetaDataPayload,
  MusicFileMetadata,
} from '../config/types';

const extractMetadata = async (filepath: string): Promise<MusicFileMetadata> => {
  const filename = path.basename(filepath);
  try {
    const metadata = await parseFile(filepath, { duration: true });
    const { common, format } = metadata;

    return {
      filename,
      filepath,
      title: common.title || filename.replace(/\.mp3$/i, ''),
      artist: common.artist || common.albumartist,
      album: common.album,
      genre: common.genre?.[0],
      year: common.year,
      duration: format.duration ? Math.round(format.duration) : undefined,
      trackNumber: common.track?.no || undefined,
      language: common.language,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
      sampleRate: format.sampleRate,
      size: undefined, // filled below via fs.statSync if needed
    };
  } catch (err) {
    logger.warn(`Could not parse metadata for "${filename}": ${(err as Error).message}`);
    return {
      filename,
      filepath,
      title: filename.replace(/\.mp3$/i, ''),
    };
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
        const meta = await extractMetadata(filepath);
        files.push(meta);
        
        // Log extracted metadata details
        logger.info(`  [METADATA] ${path.basename(filepath)} | Title: ${meta.title} | Artist: ${meta.artist || 'N/A'} | Album: ${meta.album || 'N/A'} | Genre: ${meta.genre || 'N/A'} | Year: ${meta.year || 'N/A'} | Duration: ${meta.duration ? `${meta.duration}s` : 'N/A'} | Bitrate: ${meta.bitrate ? `${meta.bitrate}kbps` : 'N/A'} | SampleRate: ${meta.sampleRate ? `${meta.sampleRate}Hz` : 'N/A'}`);
        
        // Save metadata to PostgreSQL
        try {
          await saveMetadata(meta);
          logger.info(`  [DONE] ${path.basename(filepath)} → metadata extracted and saved to database`);
        } catch (dbErr) {
          logger.error(`  [DB FAIL] ${path.basename(filepath)} | reason: ${(dbErr as Error).message}`);
        }
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
