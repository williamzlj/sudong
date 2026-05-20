import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, ChatHistory, SearchResult } from '../types';
import { saveChatHistory, getChatHistoryByUserId, deleteChatHistory, saveMessage, getMessagesByChatId, deleteMessage as dbDeleteMessage } from '../db/indexedDB';

const AUTO_SAVE_DELAY = 2000;

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateTitle = (messages: Message[]): string => {
  if (messages.length === 0) return '无标题对话';
  const firstUserMessage = messages.find(m => m.sender === 'user');
  if (firstUserMessage) {
    return firstUserMessage.content.length > 30
      ? firstUserMessage.content.slice(0, 30) + '...'
      : firstUserMessage.content;
  }
  return '无标题对话';
};

const formatTimestamp = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

export const useChat = (userId: string | null, defaultReply: string = '收到！') => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);
  const currentChatId = useRef<string | null>(null);
  const defaultReplyRef = useRef(defaultReply);

  useEffect(() => {
    defaultReplyRef.current = defaultReply;
  }, [defaultReply]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!userId) return;
      try {
        const histories = await getChatHistoryByUserId(userId);
        // 排序：置顶记录在前，然后按创建日期降序
        const sortedHistories = [...histories].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setChatHistory(sortedHistories);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadHistory();
  }, [userId]);

  useEffect(() => {
    if (messages.length > 0 && !hasUnsavedChanges.current) {
      hasUnsavedChanges.current = true;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    if (messages.length > 0 && userId) {
      autoSaveTimer.current = setTimeout(() => {
        if (hasUnsavedChanges.current) {
          saveChat(userId);
          hasUnsavedChanges.current = false;
        }
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [messages, userId]);

  const sendMessage = useCallback(async (content: string, image?: string) => {
    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      image: image,
    };

    setMessages(prev => [...prev, userMessage]);

    await new Promise(resolve => setTimeout(resolve, 200));

    const botMessage: Message = {
      id: generateId(),
      content: defaultReplyRef.current,
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);
  }, []);

  const saveChat = useCallback(async (uid: string) => {
    if (messages.length === 0 || !uid) return;

    try {
      if (currentChatId.current) {
        const existingChat = chatHistory.find(c => c.id === currentChatId.current);
        if (existingChat) {
          const updatedChat: ChatHistory = {
            ...existingChat,
            messages: [...messages],
            updatedAt: new Date(),
          };
          await saveChatHistory(updatedChat);
          setChatHistory(prev => {
            const updated = prev.map(c => c.id === currentChatId.current ? updatedChat : c);
            return updated.sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
          });
        }
      } else {
        const newChat: ChatHistory = {
          id: generateId(),
          userId: uid,
          title: generateTitle(messages),
          messages: [...messages],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        currentChatId.current = newChat.id;
        await saveChatHistory(newChat);
        setChatHistory(prev => {
          const updated = [newChat, ...prev];
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        });
      }
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }, [messages, chatHistory]);

  const loadChat = useCallback(async (chat: ChatHistory) => {
    try {
      const chatMessages = await getMessagesByChatId(chat.id);
      setMessages(chatMessages.length > 0 ? chatMessages : chat.messages);
    } catch {
      setMessages(chat.messages);
    }
    currentChatId.current = chat.id;
    hasUnsavedChanges.current = false;
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChatHistory(chatId);
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
    }
    if (currentChatId.current === chatId) {
      currentChatId.current = null;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await dbDeleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
    setMessages(prev => prev.filter(m => m.id !== messageId));
    hasUnsavedChanges.current = true;
  }, []);

  const deleteAllMessages = useCallback(async () => {
    try {
      for (const message of messages) {
        await dbDeleteMessage(message.id);
      }
      
      if (currentChatId.current) {
        await deleteChatHistory(currentChatId.current);
        setChatHistory(prev => prev.filter(c => c.id !== currentChatId.current));
        currentChatId.current = null;
      }
    } catch (error) {
      console.error('Failed to delete messages:', error);
    }
    setMessages([]);
    hasUnsavedChanges.current = true;
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentChatId.current = null;
    hasUnsavedChanges.current = false;
  }, []);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const chat = chatHistory.find(c => c.id === chatId);
      if (chat) {
        const updatedChat = { ...chat, title };
        await saveChatHistory(updatedChat);
        setChatHistory(prev => prev.map(c => c.id === chatId ? updatedChat : c));
      }
    } catch (error) {
      console.error('Failed to update chat title:', error);
      setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
    }
  }, [chatHistory]);

  const updateChatNote = useCallback(async (chatId: string, note: string) => {
    try {
      const chat = chatHistory.find(c => c.id === chatId);
      if (chat) {
        const updatedChat = { ...chat, note };
        await saveChatHistory(updatedChat);
        setChatHistory(prev => prev.map(c => c.id === chatId ? updatedChat : c));
      }
    } catch (error) {
      console.error('Failed to update chat note:', error);
      setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, note } : c));
    }
  }, [chatHistory]);

  const togglePinChat = useCallback(async (chatId: string) => {
    try {
      const chat = chatHistory.find(c => c.id === chatId);
      if (chat) {
        const updatedChat = { ...chat, isPinned: !chat.isPinned };
        await saveChatHistory(updatedChat);
        setChatHistory(prev => {
          const updated = prev.map(c => c.id === chatId ? updatedChat : c);
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        });
      }
    } catch (error) {
      console.error('Failed to toggle chat pin:', error);
      setChatHistory(prev => {
        const updated = prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c);
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
    }
  }, [chatHistory]);

  const searchChats = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    chatHistory.forEach(chat => {
      chat.messages.forEach(message => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          const startIndex = message.content.toLowerCase().indexOf(lowerQuery);
          const previewStart = Math.max(0, startIndex - 20);
          const previewEnd = Math.min(message.content.length, startIndex + lowerQuery.length + 20);
          const preview = (previewStart > 0 ? '...' : '') + 
            message.content.slice(previewStart, previewEnd) + 
            (previewEnd < message.content.length ? '...' : '');

          results.push({
            chatId: chat.id,
            chatTitle: chat.title,
            messageId: message.id,
            content: message.content,
            preview,
            timestamp: message.timestamp,
          });
        }
      });
    });

    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [chatHistory]);

  const getChatsByDateRange = useCallback((startDate: Date, endDate: Date): ChatHistory[] => {
    return chatHistory.filter(chat => {
      const chatDate = new Date(chat.createdAt);
      return chatDate >= startDate && chatDate <= endDate;
    }).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [chatHistory]);

  const exportChatToWord = useCallback((chat: ChatHistory): string => {
    let content = `聊天记录：${chat.title}\n`;
    content += `创建时间：${formatTimestamp(chat.createdAt)}\n`;
    if (chat.note) {
      content += `备注：${chat.note}\n`;
    }
    content += '\n---\n\n';

    const userMessages = chat.messages.filter(m => m.sender === 'user');
    
    userMessages.forEach((message, index) => {
      content += `${index + 1}. ${message.content}\n`;
      content += `   时间：${formatTimestamp(message.timestamp)}\n\n`;
    });

    return content;
  }, []);

  const exportChatsToWord = useCallback((chats: ChatHistory[]): string => {
    let content = '收到小助手聊天记录汇总\n';
    content += `导出时间：${formatTimestamp(new Date())}\n`;
    content += `共 ${chats.length} 条记录\n\n`;
    content += '='.repeat(50) + '\n\n';

    chats.forEach((chat, chatIndex) => {
      content += `${chatIndex + 1}. ${chat.title}\n`;
      content += `创建时间：${formatTimestamp(chat.createdAt)}\n`;
      if (chat.note) {
        content += `备注：${chat.note}\n`;
      }
      
      const userMessages = chat.messages.filter(m => m.sender === 'user');
      content += `消息数：${userMessages.length}\n`;
      content += '\n';

      userMessages.forEach((message, msgIndex) => {
        content += `  ${msgIndex + 1}. ${message.content}\n`;
        content += `     时间：${formatTimestamp(message.timestamp)}\n`;
      });

      content += '\n' + '-'.repeat(50) + '\n\n';
    });

    return content;
  }, []);

  return {
    messages,
    chatHistory,
    isTyping,
    sendMessage,
    saveChat,
    loadChat,
    deleteChat,
    deleteMessage,
    deleteAllMessages,
    clearMessages,
    updateChatTitle,
    updateChatNote,
    togglePinChat,
    searchChats,
    getChatsByDateRange,
    exportChatToWord,
    exportChatsToWord,
    formatTimestamp,
  };
};
