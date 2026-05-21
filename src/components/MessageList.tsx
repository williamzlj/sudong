import { useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { Bot, User } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onDeleteMessage: (messageId: string) => void;
  isDarkMode: boolean;
  botName: string;
  botAvatar: string;
  userName: string;
  userAvatar: string;
  userNameColor?: string;
  chatBackgroundText?: string;
  fontSize?: number;
  formatTimestamp: (date: Date) => string;
  onConvertToTodo?: (content: string) => void;
  highlightMessageId?: string | null;
  selectedMessages: string[];
  onToggleSelect: (messageId: string) => void;
  showSelect: boolean;
}

export const MessageList = ({ messages, isTyping, onDeleteMessage, isDarkMode, botName, botAvatar, userName, userAvatar, userNameColor = 'text-blue-500', chatBackgroundText = '说出你的心里话吧，我会认真倾听', fontSize = 14, formatTimestamp, onConvertToTodo, highlightMessageId, selectedMessages, onToggleSelect, showSelect }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [messages, isTyping, highlightMessageId]);

  if (messages.length === 0 && !isTyping) {
    return (
      <div className={`flex flex-col items-center justify-center h-full px-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-md ${
          botAvatar && botAvatar.startsWith('data:') ? 'bg-gray-700 overflow-hidden' : (botAvatar || 'bg-gradient-to-br from-green-100 to-green-200')
        }`}>
          {botAvatar && botAvatar.startsWith('data:') ? (
            <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
          ) : (
            <Bot className={`w-10 h-10 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
          )}
        </div>
        <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {botName}已准备就绪
        </p>
        <p className="text-sm mt-1 text-gray-400">{chatBackgroundText}</p>
        <div className="mt-6 flex items-center space-x-2 text-xs text-gray-400">
          <div className={`w-8 h-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          <span>安全保密</span>
          <div className={`w-8 h-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div>
        {messages.map((message, index) => {
          const isHighlighted = message.id === highlightMessageId;
          return (
            <div 
              key={message.id} 
              className={`message-bubble ${isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg bg-yellow-50/30 p-1 -mx-1' : ''}`}
              ref={isHighlighted ? scrollRef : undefined}
            >
              {(index === 0 || messages[index - 1]?.sender !== message.sender) && (
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className={`flex items-center gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? (userAvatar && !userAvatar.startsWith('data:') ? userAvatar : 'bg-blue-500 text-white')
                        : (botAvatar && !botAvatar.startsWith('data:') ? botAvatar : 'bg-green-100 text-green-600')
                    }`}>
                      {message.sender === 'user' ? (
                        userAvatar && userAvatar.startsWith('data:') ? (
                          <img src={userAvatar} alt="User" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-4 h-4" />
                        )
                      ) : botAvatar && botAvatar.startsWith('data:') ? (
                        <img src={botAvatar} alt="Bot" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`text-xs ${message.sender === 'user' ? userNameColor : 'text-green-500'}`}>
                      {message.sender === 'user' ? (userName || '我') : botName}
                    </span>
                  </div>
                </div>
              )}
              <MessageBubble 
                key={message.id} 
                message={message} 
                onDelete={onDeleteMessage}
                isDarkMode={isDarkMode}
                formatTimestamp={formatTimestamp}
                onConvertToTodo={onConvertToTodo}
                isSelected={selectedMessages.includes(message.id)}
                onToggleSelect={onToggleSelect}
                showSelect={showSelect}
                fontSize={fontSize}
              />
            </div>
          );
        })}
      </div>
      {isTyping && (
        <div className="flex justify-start mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              botAvatar && !botAvatar.startsWith('data:') ? botAvatar : 'bg-green-100'
            }`}>
              {botAvatar && botAvatar.startsWith('data:') ? (
                <img src={botAvatar} alt="Bot" className="w-full h-full object-cover rounded-full" />
              ) : (
                <Bot className="w-4 h-4 text-green-600" />
              )}
            </div>
            <div className={`px-4 py-2 rounded-2xl rounded-bl-md shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '150ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  );
};
