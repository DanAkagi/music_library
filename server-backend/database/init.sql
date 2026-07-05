-- À exécuter dans phpMyAdmin (XAMPP) ou : mysql -u root < database/init.sql

CREATE DATABASE IF NOT EXISTS music_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE music_library;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlists (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  criteria JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_playlists_user (user_id),
  CONSTRAINT fk_playlists_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id VARCHAR(36) NOT NULL,
  filename VARCHAR(512) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_playlist_track (playlist_id, filename),
  KEY idx_playlist_position (playlist_id, position),
  CONSTRAINT fk_playlist_tracks_playlist
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
