import fs from 'fs';
import path from 'path';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { senderApiLogger as logger } from '../config/logger';
import {
  QueueMessage,
  MetaDataPayload,
  FileSuppressorPayload,
} from '../config/types';
import { getExistingFilenames, insertTrack } from './track-repository';
import { isArtistBlacklisted, loadArtistBlacklist } from './artist-blacklist';
import { isGenreBlacklisted, loadGenreBlacklist } from './genre-blacklist';
import {
  isDurationBlacklisted,
  loadDurationBlacklist,
  getDurationBlacklistReason,
} from './duree-blacklist';

const FRONTEND_MUSIC_PATH = path.resolve(
  process.env.FRONTEND_MUSIC_OUTPUT_PATH || '../client-frontend/public/music'
);

export const startSenderApi = async (): Promise<void> => {
  logger.info('--- Sender API listening on queue ---');

  if (!fs.existsSync(FRONTEND_MUSIC_PATH)) {
    fs.mkdirSync(FRONTEND_MUSIC_PATH, { recursive: true });
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
    logger.info(`Received ${files.length} file(s) to send to frontend.`);

    const artistBlacklist = loadArtistBlacklist();
    if (artistBlacklist.size > 0) {
      logger.info(`Artist blacklist loaded (${artistBlacklist.size} name(s)).`);
    }

    const genreBlacklist = loadGenreBlacklist();
    if (genreBlacklist.size > 0) {
      logger.info(`Genre blacklist loaded (${genreBlacklist.size} name(s)).`);
    }

    const durationLimits = loadDurationBlacklist();
    if (durationLimits.length > 0) {
      logger.info(`Duration blacklist loaded (${durationLimits.length} limit(s)).`);
    }

    const existingFilenames = await getExistingFilenames();
    const processedFiles: string[] = [];

    for (const meta of files) {
      logger.info(`  [BEGIN] Processing: ${meta.filename}`);
      try {
        if (isArtistBlacklisted(meta, artistBlacklist)) {
          const artist = meta.artist || meta.albumartist || '?';
          logger.warn(
            `  [BLACKLIST] ${meta.filename} — artist "${artist}" blocked, file stays in deposit folder`
          );
          continue;
        }

        if (isGenreBlacklisted(meta, genreBlacklist)) {
          const genre = meta.genre || '?';
          logger.warn(
            `  [BLACKLIST] ${meta.filename} — genre "${genre}" blocked, file stays in deposit folder`
          );
          continue;
        }

        if (isDurationBlacklisted(meta, durationLimits)) {
          const reason = getDurationBlacklistReason(meta, durationLimits) || '?';
          logger.warn(
            `  [BLACKLIST] ${meta.filename} — duration ${reason} blocked, file stays in deposit folder`
          );
          continue;
        }

        const destPath = path.join(FRONTEND_MUSIC_PATH, meta.filename);
        fs.copyFileSync(meta.filepath, destPath);
        logger.info(`  [IN PROGRESS] ${meta.filename} → copied to frontend music folder`);

        if (!existingFilenames.has(meta.filename)) {
          await insertTrack(meta);
          existingFilenames.add(meta.filename);
          logger.info(`  [IN PROGRESS] ${meta.filename} → metadata saved to MySQL`);
        } else {
          logger.warn(`  [SKIP] ${meta.filename} already in database — skipping duplicate entry`);
        }

        processedFiles.push(meta.filepath);
        logger.info(`  [DONE] ${meta.filename} → sent to frontend`);
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
