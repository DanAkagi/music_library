import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'music_library',
};

let pool: mysql.Pool | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const db = getPool();
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [DB_CONFIG.database, table, column]
  );
  return rows.length > 0;
};

export const initDatabase = async (): Promise<void> => {
  const bootstrap = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  await bootstrap.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(512) NOT NULL,
      title VARCHAR(512),
      artist VARCHAR(512),
      album VARCHAR(512),
      genre VARCHAR(255),
      year INT,
      duration INT,
      track_number INT,
      language VARCHAR(64),
      bitrate INT,
      sample_rate INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS playlists (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      criteria JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_playlists_user (user_id),
      CONSTRAINT fk_playlists_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      playlist_id VARCHAR(36) NOT NULL,
      filename VARCHAR(512) NOT NULL,
      position INT NOT NULL DEFAULT 0,
      UNIQUE KEY uk_playlist_track (playlist_id, filename),
      KEY idx_playlist_position (playlist_id, position),
      CONSTRAINT fk_playlist_tracks_playlist
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migration: anciennes playlists sans user_id
  if (!(await columnExists('playlists', 'user_id'))) {
    await db.execute('DELETE FROM playlist_tracks');
    await db.execute('DELETE FROM playlists');
    await db.execute('ALTER TABLE playlists ADD COLUMN user_id INT NOT NULL AFTER id');
    await db.execute(
      'ALTER TABLE playlists ADD CONSTRAINT fk_playlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    );
    await db.execute('CREATE INDEX idx_playlists_user ON playlists(user_id)');
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
