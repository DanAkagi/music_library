/**
 * One-time migration: import existing CSV metadata into MySQL.
 * Usage: npx ts-node scripts/migrate-csv-to-mysql.ts
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../server/config/database';
import { insertTrack } from '../server/services/track-repository';
import { MusicFileMetadata } from '../server/config/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CSV_PATH = path.resolve(
  process.env.LEGACY_CSV_PATH ||
    '../client-frontend/public/data/music_files_data.csv'
);

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

const rowToMeta = (cols: string[]): MusicFileMetadata => ({
  filename: cols[0],
  filepath: '',
  title: cols[1] || cols[0],
  artist: cols[2] || undefined,
  album: cols[3] || undefined,
  genre: cols[4] || undefined,
  year: cols[5] ? parseInt(cols[5], 10) : undefined,
  duration: cols[6] ? parseInt(cols[6], 10) : undefined,
  trackNumber: cols[7] ? parseInt(cols[7], 10) : undefined,
  language: cols[8] || undefined,
  bitrate: cols[9] ? parseInt(cols[9], 10) : undefined,
  sampleRate: cols[10] ? parseInt(cols[10], 10) : undefined,
});

const migrate = async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.log(`No CSV file at ${CSV_PATH} — nothing to migrate.`);
    return;
  }

  await initDatabase();

  const lines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter((l) => l.trim());
  const dataLines = lines[0]?.startsWith('filename') ? lines.slice(1) : lines;

  let count = 0;
  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    if (!cols[0]) continue;
    await insertTrack(rowToMeta(cols));
    count++;
  }

  console.log(`Migrated ${count} track(s) from CSV to MySQL.`);
  await closeDatabase();
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
