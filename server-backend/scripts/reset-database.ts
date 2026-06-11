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
  await getPool().execute('TRUNCATE TABLE tracks');
  console.log('✅ Table tracks vidée. La base est prête pour un nouveau traitement.');
  await closeDatabase();
};

reset().catch((err) => {
  console.error('❌ Échec:', err.message);
  process.exit(1);
});
