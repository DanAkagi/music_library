CREATE TABLE IF NOT EXISTS music_metadata (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  filepath VARCHAR(512),
  title VARCHAR(100),
  artist VARCHAR(100),
  album VARCHAR(100),
  genre VARCHAR(100),
  year INTEGER,
  duration INTEGER,
  track_number INTEGER,
  language VARCHAR(50),
  bitrate INTEGER,
  sample_rate INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blacklist (
  id SERIAL PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  type_meta VARCHAR(50) NOT NULL CHECK (type_meta IN ('artist', 'genre', 'language', 'album')),
  UNIQUE (value, type_meta)
);