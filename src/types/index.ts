export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  image?: string;
}

export interface ChatHistory {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  note?: string;
  isPinned?: boolean;
}

export interface ChatState {
  messages: Message[];
  chatHistory: ChatHistory[];
  isTyping: boolean;
}

export interface SearchResult {
  chatId: string;
  chatTitle: string;
  messageId: string;
  content: string;
  preview: string;
  timestamp: Date;
}
