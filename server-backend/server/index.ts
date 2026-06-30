import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { runUpdateChecker } from './services/update-checker';
import { startMetaDataExtractor } from './services/meta-data-extractor';
import { startSenderApi } from './services/sender-api';
import { startFileSuppressor } from './services/file-suppressor';
import { closeRabbitMQ } from './config/rabbitmq';
import { initDatabase, closeDatabase } from './config/database';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

app.use(cors({
  origin: FRONTEND_URL,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
}));
app.use(express.json());
app.use('/api', apiRouter);

const startServices = async () => {
  try {
    console.log('🎵 Starting Music Library Backend...');

    await initDatabase();
    console.log('✅ MySQL database ready.');

    // Start all RabbitMQ consumers first
    await startMetaDataExtractor();
    await startSenderApi();
    await startFileSuppressor();

    // Start the periodic update checker (also runs immediately)
    await runUpdateChecker();

    console.log('✅ All services started successfully.');
  } catch (err) {
    console.error('❌ Failed to start services:', err);
    process.exit(1);
  }
};

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await startServices();
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeRabbitMQ();
  await closeDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
