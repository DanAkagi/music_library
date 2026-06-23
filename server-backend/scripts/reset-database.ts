/**
 * Vide la table tracks pour repartir de zéro.
 * Usage: npm run db:reset
 */
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase, getPool, closeDatabase } from '../server/config/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const reset = async () => {
  await initDatabase();
  await getPool().execute('SET FOREIGN_KEY_CHECKS = 0');
  await getPool().execute('TRUNCATE TABLE playlist_tracks');
  await getPool().execute('TRUNCATE TABLE playlists');
  await getPool().execute('TRUNCATE TABLE tracks');
  await getPool().execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✅ Tables tracks, playlists et playlist_tracks vidées.');
  await closeDatabase();
};

reset().catch((err) => {
  console.error('❌ Échec:', err.message);
  process.exit(1);
});
