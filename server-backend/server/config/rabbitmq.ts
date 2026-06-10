import amqp, { Connection, Channel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export const QUEUES = {
  UPDATE_CHECKER: 'update_checker',
  META_DATA: 'meta_data_extractor',
  SENDER_API: 'sender_api',
  FILE_SUPPRESSOR: 'file_suppressor',
} as const;

let connection: Connection | null = null;
let channel: Channel | null = null;

export const getRabbitMQChannel = async (): Promise<Channel> => {
  if (!connection) {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });
  }
  if (!channel) {
    channel = await connection.createChannel();
    // Declare all queues
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, { durable: true });
    }
  }
  return channel;
};

export const closeRabbitMQ = async (): Promise<void> => {
  if (channel) await channel.close();
  if (connection) await connection.close();
  channel = null;
  connection = null;
};
