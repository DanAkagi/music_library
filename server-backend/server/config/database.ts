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
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
