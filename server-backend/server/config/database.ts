import { Pool } from 'pg';
import dotenv from 'dotenv';
import { getMaxDurationSeconds } from './appConfig';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'music_library',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS music_metadata (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        filepath VARCHAR(512),
        title VARCHAR(255),
        artist VARCHAR(255),
        album VARCHAR(255),
        genre VARCHAR(100),
        year INTEGER,
        duration INTEGER,
        track_number INTEGER,
        language VARCHAR(50),
        bitrate INTEGER,
        sample_rate INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id SERIAL PRIMARY KEY,
        value VARCHAR(255) NOT NULL,
        type_meta VARCHAR(50) NOT NULL CHECK (type_meta IN ('artist', 'genre', 'language')),
        UNIQUE (value, type_meta)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
};

// FEATURE : on enregistre désormais aussi `filepath` dès l'étape
// meta-data-extractor (le chemin source du fichier au moment de l'extraction).
// Ce filepath sera ensuite écrasé à l'étape sender-api avec le chemin dans le
// VAULT — sauf pour les chansons exclues (ex: durée > max_duration), qui
// conservent ainsi leur filepath source plutôt que de rester à NULL.
export const saveMetadata = async (metadata: any) => {
  const query = `
    INSERT INTO music_metadata (
      filename, filepath, title, artist, album, genre, year,
      duration, track_number, language, bitrate, sample_rate
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (filename) DO UPDATE SET
      filepath = EXCLUDED.filepath,
      title = EXCLUDED.title,
      artist = EXCLUDED.artist,
      album = EXCLUDED.album,
      genre = EXCLUDED.genre,
      year = EXCLUDED.year,
      duration = EXCLUDED.duration,
      track_number = EXCLUDED.track_number,
      language = EXCLUDED.language,
      bitrate = EXCLUDED.bitrate,
      sample_rate = EXCLUDED.sample_rate,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  
  const values = [
    metadata.filename,
    metadata.filepath,
    metadata.title,
    metadata.artist,
    metadata.album,
    metadata.genre,
    metadata.year,
    metadata.duration,
    metadata.trackNumber,
    metadata.language,
    metadata.bitrate,
    metadata.sampleRate,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (err) {
    console.error('Failed to save metadata:', err);
    throw err;
  }
};

// Blacklist CRUD operations
export const addToBlacklist = async (value: string, typeMeta: string) => {
  const query = `
    INSERT INTO blacklist (value, type_meta)
    VALUES ($1, $2)
    ON CONFLICT (value, type_meta) DO NOTHING
    RETURNING id
  `;
  try {
    const result = await pool.query(query, [value, typeMeta]);
    return result.rows[0]?.id;
  } catch (err) {
    console.error('Failed to add to blacklist:', err);
    throw err;
  }
};

export const removeFromBlacklist = async (id: number) => {
  const query = 'DELETE FROM blacklist WHERE id = $1';
  try {
    await pool.query(query, [id]);
  } catch (err) {
    console.error('Failed to remove from blacklist:', err);
    throw err;
  }
};

export const getBlacklist = async () => {
  const query = 'SELECT * FROM blacklist ORDER BY type_meta, value';
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Failed to get blacklist:', err);
    throw err;
  }
};

export const isBlacklisted = async (value: string, typeMeta: string) => {
  const query = 'SELECT id FROM blacklist WHERE value = $1 AND type_meta = $2';
  try {
    const result = await pool.query(query, [value, typeMeta]);
    return result.rows.length > 0;
  } catch (err) {
    console.error('Failed to check blacklist:', err);
    throw err;
  }
};

// Get all metadata from database (excluding blacklisted entries)
// FEATURE : exclut également les chansons dont la durée dépasse max_duration
// (configuré via le fichier pointé par process.env.CONFIG), quand cette
// limite est définie. Une durée inconnue (NULL) n'est jamais exclue.
export const getAllMetadata = async () => {
  const maxDuration = getMaxDurationSeconds();

  const query = `
    SELECT m.* FROM music_metadata m
    WHERE NOT EXISTS (
      SELECT 1 FROM blacklist b
      WHERE (
        (b.type_meta = 'artist' AND m.artist = b.value) OR
        (b.type_meta = 'genre' AND m.genre = b.value) OR
        (b.type_meta = 'language' AND m.language = b.value)
      )
    )
    ${maxDuration !== undefined ? 'AND (m.duration IS NULL OR m.duration <= $1)' : ''}
    ORDER BY m.title
  `;
  const values = maxDuration !== undefined ? [maxDuration] : [];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Failed to get metadata:', err);
    throw err;
  }
};

// Get filepaths from metadata (excluding blacklisted entries)
// FEATURE : exclut également les chansons dont la durée dépasse max_duration,
// même logique que getAllMetadata.
export const getMusicFiles = async () => {
  const maxDuration = getMaxDurationSeconds();

  const query = `
    SELECT m.filepath FROM music_metadata m
    WHERE m.filepath IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM blacklist b
      WHERE (
        (b.type_meta = 'artist' AND m.artist = b.value) OR
        (b.type_meta = 'genre' AND m.genre = b.value) OR
        (b.type_meta = 'language' AND m.language = b.value)
      )
    )
    ${maxDuration !== undefined ? 'AND (m.duration IS NULL OR m.duration <= $1)' : ''}
  `;
  const values = maxDuration !== undefined ? [maxDuration] : [];

  try {
    const result = await pool.query(query, values);
    return result.rows.map(row => row.filepath);
  } catch (err) {
    console.error('Failed to get music files:', err);
    throw err;
  }
};

// Update filepath for a metadata entry
export const updateFilepath = async (filename: string, filepath: string) => {
  const query = 'UPDATE music_metadata SET filepath = $1, updated_at = CURRENT_TIMESTAMP WHERE filename = $2';
  try {
    await pool.query(query, [filepath, filename]);
  } catch (err) {
    console.error('Failed to update filepath:', err);
    throw err;
  }
};

// Update metadata fields (artist, genre, language)
export const updateMetadata = async (filename: string, updates: { artist?: string; genre?: string; language?: string }) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.artist !== undefined) {
    fields.push(`artist = $${paramIndex++}`);
    values.push(updates.artist);
  }
  if (updates.genre !== undefined) {
    fields.push(`genre = $${paramIndex++}`);
    values.push(updates.genre);
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${paramIndex++}`);
    values.push(updates.language);
  }

  if (fields.length === 0) {
    return; // Nothing to update
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(filename);

  const query = `UPDATE music_metadata SET ${fields.join(', ')} WHERE filename = $${paramIndex}`;
  
  try {
    await pool.query(query, values);
  } catch (err) {
    console.error('Failed to update metadata:', err);
    throw err;
  }
};

// Remove metadata entries that match the blacklist
export const removeBlacklistedMetadata = async () => {
  const query = `
    DELETE FROM music_metadata
    WHERE EXISTS (
      SELECT 1 FROM blacklist b
      WHERE (
        (b.type_meta = 'artist' AND music_metadata.artist = b.value) OR
        (b.type_meta = 'genre' AND music_metadata.genre = b.value) OR
        (b.type_meta = 'language' AND music_metadata.language = b.value)
      )
    )
  `;
  try {
    const result = await pool.query(query);
    console.log(`Removed ${result.rowCount} blacklisted entries from metadata`);
    return result.rowCount;
  } catch (err) {
    console.error('Failed to remove blacklisted metadata:', err);
    throw err;
  }
};

export default pool;
