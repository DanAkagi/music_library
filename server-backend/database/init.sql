CREATE TABLE music_metadata (
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