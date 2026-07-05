import bcrypt from 'bcrypt';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/database';

export interface UserRow {
  id: number;
  username: string;
}

interface UserDbRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
}

const SALT_ROUNDS = 10;

export const createUser = async (username: string, password: string): Promise<UserRow> => {
  const normalized = username.trim();
  if (!normalized) throw new Error('Username required');
  if (!password) throw new Error('Password required');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [normalized, passwordHash]
  );

  return { id: result.insertId, username: normalized };
};

export const findUserByUsername = async (username: string): Promise<UserDbRow | null> => {
  const [rows] = await getPool().execute<UserDbRow[]>(
    'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1',
    [username.trim()]
  );
  return rows[0] ?? null;
};

export const findUserById = async (id: number): Promise<UserRow | null> => {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT id, username FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows[0]) return null;
  return { id: rows[0].id as number, username: rows[0].username as string };
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);
