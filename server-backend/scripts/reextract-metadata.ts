/**
 * Re-extrait les métadonnées depuis les MP3 sur disque et met à jour MySQL.
 * Usage: npm run db:reextract-metadata
 */
import 'dotenv/config';
import path from 'path';
import { RowDataPacket } from 'mysql2';
import { initDatabase, getPool } from '../server/config/database';
import { extractMetadataFromPath } from '../server/services/metadata-extractor';

const MUSIC_DIR = path.resolve(
  process.env.FRONTEND_MUSIC_OUTPUT_PATH || '../client-frontend/public/music'
);

const main = async () => {
  await initDatabase();
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT filename FROM tracks');
  let updated = 0;

  for (const row of rows) {
    const filename = row.filename as string;
    try {
      const meta = await extractMetadataFromPath(path.join(MUSIC_DIR, filename));
      await pool.execute(
        `UPDATE tracks SET title = ?, artist = ?, album = ?, genre = ?, year = ?,
         duration = ?, track_number = ?, language = ?, bitrate = ?, sample_rate = ?
         WHERE filename = ?`,
        [
          meta.title ?? null,
          meta.artist ?? null,
          meta.album ?? null,
          meta.genre ?? null,
          meta.year ?? null,
          meta.duration ?? null,
          meta.trackNumber ?? null,
          meta.language ?? null,
          meta.bitrate ?? null,
          meta.sampleRate ?? null,
          filename,
        ]
      );
      updated++;
      console.log(`✓ ${filename} → ${meta.artist ?? '—'} | ${meta.title ?? '—'} | ${meta.album ?? '—'}`);
    } catch (err) {
      console.warn(`✗ ${filename}: ${(err as Error).message}`);
    }
  }

  console.log(`\n${updated} morceau(x) re-extraits depuis ${MUSIC_DIR}`);
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
