import fs from 'fs';
import path from 'path';
import { getRabbitMQChannel, QUEUES } from '../config/rabbitmq';
import { senderApiLogger as logger } from '../config/logger';
import {
  QueueMessage,
  MetaDataPayload,
  FileSuppressorPayload,
  MusicFileMetadata,
} from '../config/types';

// Path where mp3 files are copied for the frontend to serve
const FRONTEND_MUSIC_PATH = path.resolve(
  process.env.FRONTEND_MUSIC_OUTPUT_PATH || '../client-frontend/public/music'
);
const FRONTEND_CSV_PATH = path.resolve(
  process.env.FRONTEND_CSV_OUTPUT_PATH || '../client-frontend/public/data/music_files_data.csv'
);

const CSV_HEADER = 'filename,title,artist,album,genre,year,duration,trackNumber,language,bitrate,sampleRate\n';

const escapeCSV = (val: unknown): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const metaToCSVRow = (meta: MusicFileMetadata): string => {
  return [
    meta.filename,
    meta.title,
    meta.artist,
    meta.album,
    meta.genre,
    meta.year,
    meta.duration,
    meta.trackNumber,
    meta.language,
    meta.bitrate,
    meta.sampleRate,
  ]
    .map(escapeCSV)
    .join(',') + '\n';
};

const ensureCSVHeader = (): void => {
  const dir = path.dirname(FRONTEND_CSV_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FRONTEND_CSV_PATH)) {
    fs.writeFileSync(FRONTEND_CSV_PATH, CSV_HEADER, 'utf-8');
  }
};

const getExistingFilenames = (): Set<string> => {
  if (!fs.existsSync(FRONTEND_CSV_PATH)) return new Set();
  const lines = fs.readFileSync(FRONTEND_CSV_PATH, 'utf-8').split('\n').slice(1); // skip header
  const names = new Set<string>();
  for (const line of lines) {
    if (line.trim()) names.add(line.split(',')[0]);
  }
  return names;
};

export const startSenderApi = async (): Promise<void> => {
  logger.info('--- Sender API listening on queue ---');
  ensureCSVHeader();

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

    const existingFilenames = getExistingFilenames();
    const processedFiles: string[] = [];

    for (const meta of files) {
      logger.info(`  [BEGIN] Processing: ${meta.filename}`);
      try {
        // Copy mp3 to frontend public/music
        const destPath = path.join(FRONTEND_MUSIC_PATH, meta.filename);
        fs.copyFileSync(meta.filepath, destPath);
        logger.info(`  [IN PROGRESS] ${meta.filename} → copied to frontend music folder`);

        // Append to CSV if not already present (no duplicates)
        if (!existingFilenames.has(meta.filename)) {
          fs.appendFileSync(FRONTEND_CSV_PATH, metaToCSVRow(meta), 'utf-8');
          existingFilenames.add(meta.filename);
          logger.info(`  [IN PROGRESS] ${meta.filename} → metadata written to CSV`);
        } else {
          logger.warn(`  [SKIP] ${meta.filename} already in CSV — skipping duplicate entry`);
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
