import 'dotenv/config';
import { initDatabase, getPool } from '../server/config/database';
import { normalizeFromFilename } from '../server/services/metadata-normalizer';
import { RowDataPacket } from 'mysql2';

const main = async () => {
  await initDatabase();
  const pool = getPool();

  const [rows] = await pool.execute<RowDataPacket[]>('SELECT filename, title, artist, album, genre, year, duration FROM tracks');
  let updated = 0;

  for (const row of rows) {
    const normalized = normalizeFromFilename(row.filename as string, {
      title: row.title as string,
      artist: row.artist as string | undefined,
      album: row.album as string | undefined,
      genre: row.genre as string | undefined,
      year: row.year as number | undefined,
      duration: row.duration as number | undefined,
    });

    const titleChanged = normalized.title !== row.title;
    const artistChanged = (normalized.artist ?? null) !== row.artist;
    const albumChanged = (normalized.album ?? null) !== row.album;

    if (titleChanged || artistChanged || albumChanged) {
      await pool.execute(
        'UPDATE tracks SET title = ?, artist = ?, album = ? WHERE filename = ?',
        [normalized.title, normalized.artist ?? null, normalized.album ?? null, row.filename]
      );
      updated++;
      console.log(`✓ ${row.filename}`);
      console.log(`  titre: ${row.title} → ${normalized.title}`);
      console.log(`  artiste: ${row.artist ?? '—'} → ${normalized.artist ?? '—'}`);
      console.log(`  album: ${row.album ?? '—'} → ${normalized.album ?? '—'}`);
    }
  }

  console.log(`\n${updated} morceau(x) mis à jour sur ${rows.length}.`);
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
