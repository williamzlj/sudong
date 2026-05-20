import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { User, BotSettings } from '../types/auth';
import { Message, ChatHistory } from '../types';
import { Todo } from '../types/todo';

let db: Database | null = null;

export const initDB = async (dbPath: string = './data/app.db') => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT 'bg-blue-500',
      is_active INTEGER DEFAULT 1,
      is_banned INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '小树',
      avatar TEXT DEFAULT 'bg-green-500',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sender TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chat_history(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      deadline TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const adminExists = await db.get('SELECT COUNT(*) as count FROM admin_users');
  if (adminExists.count === 0) {
    await db.run(
      'INSERT INTO admin_users (id, username, password, created_at) VALUES (?, ?, ?, ?)',
      ['admin', 'admin', 'admin123', new Date().toISOString()]
    );
  }

  return db;
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const saveUser = async (user: User) => {
  const database = getDB();
  await database.run(
    'INSERT OR REPLACE INTO users (id, username, email, password, avatar, is_active, is_banned, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      user.username,
      user.email,
      user.password,
      user.avatar || 'bg-blue-500',
      user.isActive ? 1 : 0,
      user.isBanned ? 1 : 0,
      user.role || 'user',
      user.createdAt.toISOString(),
      new Date().toISOString(),
    ]
  );
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const database = getDB();
  const row = await database.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row) return null;
  return {
    ...row,
    isActive: row.is_active === 1,
    isBanned: row.is_banned === 1,
    createdAt: new Date(row.created_at),
  } as User;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const database = getDB();
  const row = await database.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    isActive: row.is_active === 1,
    isBanned: row.is_banned === 1,
    createdAt: new Date(row.created_at),
  } as User;
};

export const getAllUsers = async (): Promise<User[]> => {
  const database = getDB();
  const rows = await database.all('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(row => ({
    ...row,
    isActive: row.is_active === 1,
    isBanned: row.is_banned === 1,
    createdAt: new Date(row.created_at),
  }));
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  const database = getDB();
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.username) {
    setClauses.push('username = ?');
    values.push(updates.username);
  }
  if (updates.email) {
    setClauses.push('email = ?');
    values.push(updates.email);
  }
  if (updates.password) {
    setClauses.push('password = ?');
    values.push(updates.password);
  }
  if (updates.avatar !== undefined) {
    setClauses.push('avatar = ?');
    values.push(updates.avatar);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.isBanned !== undefined) {
    setClauses.push('is_banned = ?');
    values.push(updates.isBanned ? 1 : 0);
  }
  if (updates.role) {
    setClauses.push('role = ?');
    values.push(updates.role);
  }

  values.push(id);

  await database.run(`UPDATE users SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, [
    ...values.slice(0, -1),
    new Date().toISOString(),
    values[values.length - 1],
  ]);
};

export const deleteUser = async (id: string) => {
  const database = getDB();
  await database.run('DELETE FROM users WHERE id = ?', [id]);
};

export const saveBotSettings = async (userId: string, settings: Partial<BotSettings>) => {
  const database = getDB();
  await database.run(
    'INSERT OR REPLACE INTO bot_settings (user_id, name, avatar) VALUES (?, ?, ?)',
    [userId, settings.name || '小树', settings.avatar || 'bg-green-500']
  );
};

export const getBotSettings = async (userId: string): Promise<BotSettings | null> => {
  const database = getDB();
  const row = await database.get('SELECT * FROM bot_settings WHERE user_id = ?', [userId]);
  if (!row) {
    await saveBotSettings(userId, { name: '小树', avatar: 'bg-green-500' });
    return { name: '小树', avatar: 'bg-green-500' };
  }
  return row as BotSettings;
};

export const saveChatHistory = async (chat: ChatHistory) => {
  const database = getDB();
  await database.run(
    'INSERT OR REPLACE INTO chat_history (id, user_id, title, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      chat.id,
      chat.userId,
      chat.title,
      chat.note || '',
      chat.createdAt.toISOString(),
      new Date().toISOString(),
    ]
  );
};

export const getChatHistoryByUserId = async (userId: string): Promise<ChatHistory[]> => {
  const database = getDB();
  const rows = await database.all('SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(row => ({
    ...row,
    createdAt: new Date(row.created_at),
  }));
};

export const deleteChatHistory = async (id: string) => {
  const database = getDB();
  await database.run('DELETE FROM chat_history WHERE id = ?', [id]);
};

export const saveMessage = async (message: Message, chatId: string) => {
  const database = getDB();
  await database.run(
    'INSERT INTO messages (id, chat_id, content, sender, timestamp) VALUES (?, ?, ?, ?, ?)',
    [message.id, chatId, message.content, message.sender, message.timestamp.toISOString()]
  );
};

export const getMessagesByChatId = async (chatId: string): Promise<Message[]> => {
  const database = getDB();
  const rows = await database.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC', [chatId]);
  return rows.map(row => ({
    ...row,
    timestamp: new Date(row.timestamp),
  }));
};

export const deleteMessage = async (id: string) => {
  const database = getDB();
  await database.run('DELETE FROM messages WHERE id = ?', [id]);
};

export const deleteMessagesByChatId = async (chatId: string) => {
  const database = getDB();
  await database.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
};

export const saveTodo = async (todo: Todo) => {
  const database = getDB();
  await database.run(
    'INSERT OR REPLACE INTO todos (id, user_id, title, note, created_at, deadline, is_pinned, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      todo.id,
      todo.userId,
      todo.title,
      todo.note || '',
      todo.createdAt.toISOString(),
      todo.deadline.toISOString(),
      todo.isPinned ? 1 : 0,
      todo.isCompleted ? 1 : 0,
    ]
  );
};

export const getTodosByUserId = async (userId: string): Promise<Todo[]> => {
  const database = getDB();
  const rows = await database.all('SELECT * FROM todos WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC', [userId]);
  return rows.map(row => ({
    ...row,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    deadline: new Date(row.deadline),
    isPinned: row.is_pinned === 1,
    isCompleted: row.is_completed === 1,
  }));
};

export const deleteTodo = async (id: string) => {
  const database = getDB();
  await database.run('DELETE FROM todos WHERE id = ?', [id]);
};

export const authenticateAdmin = async (username: string, password: string): Promise<boolean> => {
  const database = getDB();
  const row = await database.get('SELECT * FROM admin_users WHERE username = ? AND password = ?', [username, password]);
  return row !== undefined;
};

export const exportDatabase = async (): Promise<Buffer> => {
  const database = getDB();
  const data: Record<string, any[]> = {};
  
  const tables = ['users', 'bot_settings', 'chat_history', 'messages', 'todos', 'admin_users'];
  
  for (const table of tables) {
    data[table] = await database.all(`SELECT * FROM ${table}`);
  }
  
  return Buffer.from(JSON.stringify(data, null, 2));
};

export const importDatabase = async (data: Record<string, any[]>): Promise<void> => {
  const database = getDB();
  
  await database.run('BEGIN TRANSACTION');
  
  try {
    const tables = ['users', 'bot_settings', 'chat_history', 'messages', 'todos', 'admin_users'];
    
    for (const table of tables) {
      await database.run(`DELETE FROM ${table}`);
      
      if (data[table] && data[table].length > 0) {
        const columns = Object.keys(data[table][0]);
        const placeholders = columns.map(() => '?').join(',');
        
        for (const row of data[table]) {
          const values = columns.map(col => row[col]);
          await database.run(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`, values);
        }
      }
    }
    
    await database.run('COMMIT');
  } catch (error) {
    await database.run('ROLLBACK');
    throw error;
  }
};
