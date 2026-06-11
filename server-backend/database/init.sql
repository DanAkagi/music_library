-- À exécuter dans phpMyAdmin (XAMPP) ou : mysql -u root < database/init.sql

CREATE DATABASE IF NOT EXISTS music_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE music_library;

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
