import path from 'path';
import { parseFile } from 'music-metadata';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { metaDataLogger as logger } from '../config/logger';
import {
  QueueMessage,
  UpdateCheckerPayload,
  MetaDataPayload,
  MusicFileMetadata,
} from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

const MUSIC_PATH = process.env.MUSIC_PATH || '';

/** Genre depuis le 1er sous-dossier sous MUSIC_PATH (ex. music files/Sega/titre.mp3 → Sega) */
const inferGenreFromPath = (filepath: string): string | undefined => {
  if (!MUSIC_PATH) return undefined;
  const root = path.resolve(MUSIC_PATH);
  const parent = path.dirname(path.resolve(filepath));
  const relative = path.relative(root, parent);
  if (!relative || relative.startsWith('..') || relative === '.') return undefined;
  const segment = relative.split(path.sep).find(Boolean);
  return segment?.trim() || undefined;
};

const readGenre = (common: { genre?: string[] }, filepath: string): string | undefined =>
  common.genre?.[0] || inferGenreFromPath(filepath);

const extractMetadata = async (filepath: string): Promise<MusicFileMetadata> => {
  const filename = path.basename(filepath);
  try {
    const metadata = await parseFile(filepath, { duration: true });
    const { common, format } = metadata;

    return normalizeMetadata({
      filename,
      filepath,
      title: common.title || filename.replace(/\.mp3$/i, ''),
      artist: common.artist || common.artists?.[0] || common.albumartist,
      album: common.album,
      genre: readGenre(common, filepath),
      year: common.year,
      duration: format.duration ? Math.round(format.duration) : undefined,
      trackNumber: common.track?.no || undefined,
      language: common.language,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
      sampleRate: format.sampleRate,
      size: undefined,
    });
  } catch (err) {
    logger.warn(`Could not parse metadata for "${filename}": ${(err as Error).message}`);
    return normalizeMetadata({
      filename,
      filepath,
      title: filename.replace(/\.mp3$/i, ''),
      genre: inferGenreFromPath(filepath),
    });
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
