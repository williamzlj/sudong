import { useState, useRef } from 'react';
import { Message } from '../types';
import { ListTodo, Copy, Download } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onDelete: (messageId: string) => void;
  isDarkMode?: boolean;
  formatTimestamp: (date: Date) => string;
  onConvertToTodo?: (content: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  showSelect?: boolean;
}

export const MessageBubble = ({ message, onDelete, isDarkMode = false, formatTimestamp, onConvertToTodo, isSelected = false, onToggleSelect, showSelect = false }: MessageBubbleProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isUser = message.sender === 'user';

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setMenuPosition({
          x: rect.right - 100,
          y: rect.top + 10,
        });
        setShowMenu(true);
      }
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setMenuPosition({
          x: rect.right - 100,
          y: rect.top + 10,
        });
        setShowMenu(true);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowMenu(false);
  };

  const handleConvertToTodo = () => {
    if (onConvertToTodo) {
      onConvertToTodo(message.content);
    }
    setShowMenu(false);
  };

  const handleCopy = async () => {
    try {
      if (message.content) {
        await navigator.clipboard.writeText(message.content);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
    setShowMenu(false);
  };

  const handleCopyWithTimestamp = async () => {
    try {
      if (message.content) {
        const timestamp = formatTimestamp(message.timestamp);
        const contentWithTimestamp = `${timestamp}\n${message.content}`;
        await navigator.clipboard.writeText(contentWithTimestamp);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
    setShowMenu(false);
  };

  const handleSaveImage = () => {
    if (message.image) {
      const link = document.createElement('a');
      link.href = message.image;
      link.download = `image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowMenu(false);
  };

  const handleCancel = () => {
    setShowMenu(false);
  };

  return (
    <>
      <div
        ref={bubbleRef}
        className={`flex items-center ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {showSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect && onToggleSelect(message.id)}
            className="w-4 h-4 mr-2 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div
          className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl cursor-pointer transition-transform active:scale-95 ${
            isUser
              ? 'bg-green-500 text-black rounded-br-md'
              : isDarkMode
              ? 'bg-gray-700 text-gray-200 rounded-bl-md'
              : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
          } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          {message.image && (
            <img
              src={message.image}
              alt="图片"
              className="max-w-full h-auto rounded-lg mb-2"
            />
          )}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          <p
            className={`text-xs mt-1 ${
              isUser ? 'text-green-200 text-right' : 'text-gray-400'
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
      
      {showMenu && (
        <div
          className={`fixed rounded-lg shadow-xl border p-2 z-50 min-w-[140px] ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
          }`}
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={handleCancel}
        >
          <p className={`text-xs mb-2 border-b px-3 py-2 ${
              isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-100'
            }`}>长按操作</p>
          
          {message.content && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDarkMode ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>复制消息</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyWithTimestamp();
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDarkMode ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>复制消息(带时间)</span>
              </button>
            </>
          )}
          
          {message.image && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveImage();
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isDarkMode ? 'text-purple-400 hover:bg-gray-600' : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>保存图片</span>
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConvertToTodo();
            }}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isDarkMode ? 'text-green-400 hover:bg-gray-600' : 'text-green-600 hover:bg-green-50'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>转化为待办</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className={`w-full text-red-500 px-3 py-2 rounded-lg text-sm transition-colors ${
              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-red-50'
            }`}
          >
            删除消息
          </button>
        </div>
      )}
    </>
  );
};
