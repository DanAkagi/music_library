import { Pool } from 'pg';
import dotenv from 'dotenv';

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
    console.log('Database table initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
};

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

export default pool;
