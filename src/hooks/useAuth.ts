import { useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterCredentials, UpdateProfileData, BotSettings } from '../types/auth';
import { initDB, saveUser, getUserByEmail, updateUser, saveBotSettings, getBotSettings } from '../db/indexedDB';

const AUTH_STORAGE_KEY = 'tree-hole-auth';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const defaultBotSettings: BotSettings = {
  name: '小树',
  avatar: 'bg-green-500',
  defaultReply: '收到！',
  productName: '树洞',
  productDescription: '倾诉你的心声',
  chatHint: '你的秘密很安全',
  chatBackgroundText: '说出你的心里话吧，我会认真倾听',
  fontSize: 14,
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [botSettings, setBotSettings] = useState<BotSettings>(defaultBotSettings);

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            if (authData.userId) {
              const users = await getUserByEmail(authData.email);
              if (users) {
                setUser(users);
                const settings = await getBotSettings(users.id);
                setBotSettings(settings || defaultBotSettings);
              }
            }
          } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      const foundUser = await getUserByEmail(credentials.email);
      
      if (!foundUser) {
        return { success: false, message: '系统中无该用户' };
      }

      if (!foundUser.isActive) {
        return { success: false, message: '您的账户已被停用' };
      }

      if (hashPassword(credentials.password) !== foundUser.password) {
        return { success: false, message: '密码错误' };
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: foundUser.id, email: foundUser.email }));
      setUser(foundUser);
      const settings = await getBotSettings(foundUser.id);
      setBotSettings(settings || defaultBotSettings);
      return { success: true, message: '登录成功' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: '登录失败' };
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      const existingUser = await getUserByEmail(credentials.email);
      
      if (existingUser) {
        return { success: false, message: '该邮箱已被注册' };
      }

      const newUser: User = {
        id: generateId(),
        username: credentials.username,
        email: credentials.email,
        password: hashPassword(credentials.password),
        avatar: 'bg-blue-500',
        isActive: true,
        isBanned: false,
        role: 'user',
        createdAt: new Date(),
      };

      await saveUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: newUser.id, email: newUser.email }));
      setUser(newUser);
      
      await saveBotSettings(newUser.id, defaultBotSettings);
      setBotSettings(defaultBotSettings);
      
      return { success: true, message: '注册成功' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: '注册失败' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: '请先登录' };
    }

    try {
      const updates: Partial<User> = {};

      if (data.username) updates.username = data.username;
      if (data.email) updates.email = data.email;
      if (data.avatar !== undefined) updates.avatar = data.avatar;
      if (data.userNameColor !== undefined) updates.userNameColor = data.userNameColor;
      
      if (data.password) {
        if (!data.currentPassword) {
          return { success: false, message: '请输入当前密码' };
        }
        
        if (hashPassword(data.currentPassword) !== user.password) {
          return { success: false, message: '当前密码不正确' };
        }
        
        updates.password = hashPassword(data.password);
      }

      await updateUser(user.id, updates);
      
      const updatedUser = await getUserByEmail(user.email);
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: updatedUser.id, email: updatedUser.email }));
      }

      return { success: true, message: '更新成功' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: '更新失败' };
    }
  }, [user]);

  const updateBotSettings = useCallback(async (settings: Partial<BotSettings>) => {
    try {
      const currentSettings = botSettings || defaultBotSettings;
      const newSettings: BotSettings = {
        ...defaultBotSettings,
        ...currentSettings,
        ...settings,
      };
      
      if (user) {
        await saveBotSettings(user.id, newSettings);
      }
      setBotSettings(newSettings);
    } catch (error) {
      console.error('Failed to update bot settings:', error);
      throw error;
    }
  }, [user, botSettings]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    botSettings,
    login,
    register,
    logout,
    updateProfile,
    updateBotSettings,
  };
};
