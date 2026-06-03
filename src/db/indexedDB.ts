import { User, BotSettings } from '../types/auth';
import { Message, ChatHistory } from '../types';
import { Todo } from '../types/todo';

const DB_NAME = 'TreeHoleDB';
const DB_VERSION = 4;

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion || 0;

      if (!database.objectStoreNames.contains('users')) {
        const userStore = database.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
        userStore.createIndex('isActive', 'isActive');
        userStore.createIndex('isBanned', 'isBanned');
      }

      if (!database.objectStoreNames.contains('bot_settings')) {
        const botStore = database.createObjectStore('bot_settings', { keyPath: 'userId' });
      }

      if (!database.objectStoreNames.contains('chat_history')) {
        const chatStore = database.createObjectStore('chat_history', { keyPath: 'id' });
        chatStore.createIndex('userId', 'userId');
        chatStore.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains('messages')) {
        const msgStore = database.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('chatId', 'chatId');
        msgStore.createIndex('timestamp', 'timestamp');
      }

      if (!database.objectStoreNames.contains('todos')) {
        const todoStore = database.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('userId', 'userId');
        todoStore.createIndex('isCompleted', 'isCompleted');
        todoStore.createIndex('isPinned', 'isPinned');
      }

      if (!database.objectStoreNames.contains('admin_users')) {
        const adminStore = database.createObjectStore('admin_users', { keyPath: 'id' });
        adminStore.createIndex('username', 'username', { unique: true });
      }

      // 数据迁移：添加 fontSize 字段到旧数据
      if (oldVersion < 4 && database.objectStoreNames.contains('bot_settings')) {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const botStore = transaction?.objectStore('bot_settings');
        if (botStore) {
          botStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const settings = cursor.value;
              if (!settings.fontSize) {
                settings.fontSize = 16;
                cursor.update(settings);
              }
              cursor.continue();
            }
          };
        }
      }
    };
  });
};

const getDB = (): IDBDatabase => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const saveUser = async (user: User): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(user);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const index = store.index('email');
    const request = index.get(email);
    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
      } else {
        resolve({
          ...result,
          isActive: result.isActive !== undefined ? result.isActive : true,
          isBanned: result.isBanned !== undefined ? result.isBanned : false,
        } as User);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getUserById = async (id: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const user = getRequest.result;
      if (!user) {
        reject(new Error('User not found'));
        return;
      }
      
      const updatedUser = { ...user, ...updates };
      const putRequest = store.put(updatedUser);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['users', 'bot_settings', 'chat_history', 'messages', 'todos'], 'readwrite');
    
    transaction.objectStore('todos').delete(IDBKeyRange.only(id), 'userId');
    transaction.objectStore('messages').delete(IDBKeyRange.only(id), 'chatId');
    transaction.objectStore('chat_history').delete(IDBKeyRange.only(id), 'userId');
    transaction.objectStore('bot_settings').delete(id);
    transaction.objectStore('users').delete(id);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveBotSettings = async (userId: string, settings: BotSettings): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDB();
      const transaction = database.transaction(['bot_settings'], 'readwrite');
      const store = transaction.objectStore('bot_settings');
      
      const data = { userId, ...settings };
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        console.error('Request error:', request.error);
        reject(request.error);
      };
      
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error('Save bot settings error:', error);
      reject(error);
    }
  });
};

export const getBotSettings = async (userId: string): Promise<BotSettings> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['bot_settings'], 'readonly');
    const store = transaction.objectStore('bot_settings');
    const request = store.get(userId);
    
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const settings: BotSettings = {
          name: result.name || '小树',
          avatar: result.avatar || 'bg-green-500',
          defaultReply: result.defaultReply || '收到！',
          productName: result.productName || '树洞',
          productDescription: result.productDescription || '倾诉你的心声',
          chatHint: result.chatHint || '你的秘密很安全',
          chatBackgroundText: result.chatBackgroundText || '说出你的心里话吧，我会认真倾听',
          fontSize: result.fontSize || 16,
        };
        resolve(settings);
      } else {
        const defaultSettings: BotSettings = { 
          name: '小树', 
          avatar: 'bg-green-500', 
          defaultReply: '收到！',
          productName: '树洞',
          productDescription: '倾诉你的心声',
          chatHint: '你的秘密很安全',
          chatBackgroundText: '说出你的心里话吧，我会认真倾听',
          fontSize: 16,
        };
        saveBotSettings(userId, defaultSettings).then(() => resolve(defaultSettings));
      }
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const saveChatHistory = async (chat: ChatHistory): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['chat_history'], 'readwrite');
    const store = transaction.objectStore('chat_history');
    const request = store.put(chat);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getChatHistoryByUserId = async (userId: string): Promise<ChatHistory[]> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['chat_history'], 'readonly');
    const store = transaction.objectStore('chat_history');
    const index = store.index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => {
      const results = request.result || [];
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteChatHistory = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['chat_history', 'messages'], 'readwrite');
    const messageStore = transaction.objectStore('messages');
    const chatStore = transaction.objectStore('chat_history');
    const chatIndex = messageStore.index('chatId');
    
    // Delete all messages with this chatId first
    const cursorRequest = chatIndex.openCursor(IDBKeyRange.only(id));
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBOpenDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // All messages deleted, now synchronously delete the chat history record
        chatStore.delete(id);
      }
    };
    cursorRequest.onerror = () => {
      reject(cursorRequest.error);
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveMessage = async (message: Message, chatId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.put({ ...message, chatId });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getMessagesByChatId = async (chatId: string): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('chatId');
    const request = index.getAll(chatId);
    request.onsuccess = () => {
      const results = request.result || [];
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteMessage = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveTodo = async (todo: Todo): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['todos'], 'readwrite');
    const store = transaction.objectStore('todos');
    const request = store.put(todo);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getTodosByUserId = async (userId: string): Promise<Todo[]> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['todos'], 'readonly');
    const store = transaction.objectStore('todos');
    const index = store.index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => {
      const results = request.result || [];
      results.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteTodo = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['todos'], 'readwrite');
    const store = transaction.objectStore('todos');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export interface ImageInfo {
  id: string;
  type: 'user_avatar' | 'bot_avatar' | 'message_image';
  data: string;
  ownerId?: string;
  chatId?: string;
  timestamp?: Date;
  size: number;
}

export const getAllImagesByUserId = async (userId: string): Promise<ImageInfo[]> => {
  const images: ImageInfo[] = [];
  
  const user = await getUserById(userId);
  if (user?.avatar?.startsWith('data:')) {
    images.push({
      id: `user_avatar_${userId}`,
      type: 'user_avatar',
      data: user.avatar,
      ownerId: userId,
      size: user.avatar.length,
    });
  }
  
  const botSettings = await getBotSettings(userId);
  if (botSettings.avatar?.startsWith('data:')) {
    images.push({
      id: `bot_avatar_${userId}`,
      type: 'bot_avatar',
      data: botSettings.avatar,
      ownerId: userId,
      size: botSettings.avatar.length,
    });
  }
  
  try {
    const chatHistory = await getChatHistoryByUserId(userId);
    for (const chat of chatHistory) {
      const messages = chat.messages || [];
      for (const msg of messages) {
        if (msg.image && typeof msg.image === 'string' && msg.image.startsWith('data:')) {
          images.push({
            id: msg.id,
            type: 'message_image',
            data: msg.image,
            ownerId: userId,
            chatId: chat.id,
            timestamp: msg.timestamp,
            size: msg.image.length,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading message images:', error);
  }
  
  return images;
};

export const deleteImage = async (imageId: string, type: 'user_avatar' | 'bot_avatar' | 'message_image', userId: string): Promise<void> => {
  if (type === 'message_image') {
    try {
      const chatHistory = await getChatHistoryByUserId(userId);
      
      for (const chat of chatHistory) {
        if (!chat.messages || !Array.isArray(chat.messages)) continue;
        
        const msgIndex = chat.messages.findIndex(m => m && m.id === imageId);
        if (msgIndex >= 0) {
          const updatedMessages = [...chat.messages];
          const messageToUpdate = updatedMessages[msgIndex];
          
          updatedMessages[msgIndex] = {
            id: messageToUpdate.id,
            content: messageToUpdate.content || '',
            sender: messageToUpdate.sender || 'user',
            timestamp: messageToUpdate.timestamp || new Date(),
          };
          
          const updatedChat: ChatHistory = { 
            ...chat, 
            messages: updatedMessages, 
            updatedAt: new Date() 
          };
          
          await saveChatHistory(updatedChat);
          
          const messagesFromStore = await getMessagesByChatId(chat.id);
          if (messagesFromStore.length > 0) {
            for (const msg of messagesFromStore) {
              if (msg.id === imageId) {
                const updatedMsg: Message = {
                  id: msg.id,
                  content: msg.content || '',
                  sender: msg.sender || 'user',
                  timestamp: msg.timestamp || new Date(),
                };
                await saveMessage(updatedMsg, chat.id);
              }
            }
          }
          
          console.log('Message image deleted successfully:', imageId);
          return;
        }
      }
      
      console.warn('Message not found for deletion:', imageId);
    } catch (error) {
      console.error('Error deleting message image:', error);
      throw error;
    }
  } else if (type === 'user_avatar') {
    try {
      await updateUser(userId, { avatar: 'bg-blue-500' });
    } catch (error) {
      console.error('Error deleting user avatar:', error);
      throw error;
    }
  } else if (type === 'bot_avatar') {
    try {
      const currentSettings = await getBotSettings(userId);
      await saveBotSettings(userId, { ...currentSettings, avatar: 'bg-green-500' });
    } catch (error) {
      console.error('Error deleting bot avatar:', error);
      throw error;
    }
  }
};

export const getStorageInfo = async (userId: string): Promise<{ used: number; imageCount: number }> => {
  const images = await getAllImagesByUserId(userId);
  const totalSize = images.reduce((acc, img) => acc + img.size, 0);
  return {
    used: totalSize,
    imageCount: images.length,
  };
};

export const authenticateAdmin = async (username: string, password: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(['admin_users'], 'readonly');
    const store = transaction.objectStore('admin_users');
    const index = store.index('username');
    const request = index.get(username);
    
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.password === password) {
        resolve(true);
      } else {
        if (!result) {
          const adminUser = {
            id: 'admin',
            username: 'admin',
            password: 'admin123',
            createdAt: new Date().toISOString()
          };
          const writeTransaction = database.transaction(['admin_users'], 'readwrite');
          writeTransaction.objectStore('admin_users').put(adminUser);
          writeTransaction.oncomplete = () => {
            resolve(username === 'admin' && password === 'admin123');
          };
        } else {
          resolve(false);
        }
      }
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const exportDatabase = async (userId?: string): Promise<string> => {
  const database = getDB();
  const data: Record<string, any[]> = {};
  
  if (userId) {
    const userData = await new Promise<any>((resolve) => {
      const transaction = database.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || null);
    });
    
    data['users'] = userData ? [{
      id: userData.id,
      username: userData.username,
      email: userData.email,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    }] : [];
    
    data['bot_settings'] = await new Promise((resolve) => {
      const transaction = database.transaction(['bot_settings'], 'readonly');
      const store = transaction.objectStore('bot_settings');
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result ? [request.result] : []);
    });
    
    const chatHistory = await getChatHistoryByUserId(userId);
    data['chat_history'] = chatHistory;
    
    const messages: any[] = [];
    for (const chat of chatHistory) {
      const chatMessages = await getMessagesByChatId(chat.id);
      messages.push(...chatMessages);
    }
    data['messages'] = messages;
    
    data['todos'] = await getTodosByUserId(userId);
    
    data['admin_users'] = [];
  } else {
    const stores = ['users', 'bot_settings', 'chat_history', 'messages', 'todos', 'admin_users'];
    
    for (const storeName of stores) {
      data[storeName] = await new Promise((resolve) => {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
      });
    }
  }
  
  return JSON.stringify(data, null, 2);
};

export const exportAllDatabase = async (): Promise<string> => {
  const database = getDB();
  const data: Record<string, any[]> = {};
  
  const stores = ['users', 'bot_settings', 'chat_history', 'messages', 'todos', 'admin_users'];
  
  for (const storeName of stores) {
    data[storeName] = await new Promise((resolve) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }
  
  return JSON.stringify(data, null, 2);
};

export const importDatabase = async (jsonData: string, targetEmail?: string): Promise<void> => {
  const database = getDB();
  const data = JSON.parse(jsonData);
  
  return new Promise((resolve, reject) => {
    if (!data['users'] || data['users'].length === 0) {
      reject(new Error('导入数据中没有用户信息'));
      return;
    }
    
    const sourceUser = data['users'][0];
    const sourceUserId = sourceUser.id;
    const sourceEmail = sourceUser.email || targetEmail;
    
    if (!sourceEmail) {
      reject(new Error('无法确定用户标识（邮箱）'));
      return;
    }
    
    const transaction = database.transaction(['users', 'bot_settings', 'chat_history', 'messages', 'todos'], 'readwrite');
    
    const usersStore = transaction.objectStore('users');
    const botSettingsStore = transaction.objectStore('bot_settings');
    const chatHistoryStore = transaction.objectStore('chat_history');
    const messagesStore = transaction.objectStore('messages');
    const todosStore = transaction.objectStore('todos');
    
    let targetUserId: string;
    
    const getExistingUserRequest = usersStore.index('email').get(sourceEmail);
    
    getExistingUserRequest.onsuccess = () => {
      const existingUser = getExistingUserRequest.result;
      
      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        targetUserId = Date.now().toString();
        const newUser = {
          id: targetUserId,
          username: sourceUser.username,
          email: sourceEmail,
          password: '',
          avatar: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        usersStore.put(newUser);
      }
      
      const idMap: Record<string, string> = {};
      idMap[sourceUserId] = targetUserId;
      
      if (data['bot_settings'] && data['bot_settings'].length > 0) {
        const sourceBotSettings = data['bot_settings'][0];
        if (sourceBotSettings.id === sourceUserId) {
          const existingBotSettingsRequest = botSettingsStore.get(targetUserId);
          existingBotSettingsRequest.onsuccess = () => {
            const existingBotSettings = existingBotSettingsRequest.result;
            if (!existingBotSettings) {
              const newBotSettings = { ...sourceBotSettings, id: targetUserId };
              botSettingsStore.put(newBotSettings);
            }
          };
        }
      }
      
      const chatHistory = data['chat_history'] || [];
      const messages = data['messages'] || [];
      const todos = data['todos'] || [];
      
      chatHistory.forEach((chat: any) => {
        if (chat.userId === sourceUserId) {
          const newChatId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          idMap[chat.id] = newChatId;
          
          const newChat = {
            ...chat,
            id: newChatId,
            userId: targetUserId
          };
          chatHistoryStore.put(newChat);
        }
      });
      
      messages.forEach((msg: any) => {
        if (idMap[msg.chatId]) {
          const newMsgId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const newMessage = {
            ...msg,
            id: newMsgId,
            chatId: idMap[msg.chatId]
          };
          messagesStore.put(newMessage);
        }
      });
      
      todos.forEach((todo: any) => {
        if (todo.userId === sourceUserId) {
          const newTodoId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const newTodo = {
            ...todo,
            id: newTodoId,
            userId: targetUserId
          };
          todosStore.put(newTodo);
        }
      });
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
