import { useState, KeyboardEvent, useRef } from 'react';
import { Send, Paperclip, Smile, X, Menu } from 'lucide-react';

interface InputBoxProps {
  onSend: (content: string, image?: string) => void;
  onSave: () => void;
  hasMessages: boolean;
  disabled?: boolean;
  isDarkMode?: boolean;
  isBanned?: boolean;
  onToggleSidebar?: () => void;
  fontSize?: number;
}

export const InputBox = ({ onSend, onSave, hasMessages, disabled = false, isDarkMode = false, isBanned = false, onToggleSidebar, fontSize = 14 }: InputBoxProps) => {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const MAX_LINES = 15;
  const LINE_HEIGHT = 20;

  const MAX_WIDTH = 600;
  const MAX_SIZE_KB = 400;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = (MAX_WIDTH / width) * height;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const fileSizeKB = file.size / 1024;
      
      if (fileSizeKB > MAX_SIZE_KB) {
        const compressedImage = await compressImage(file);
        setSelectedImage(compressedImage);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if ((input.trim() || selectedImage) && !disabled) {
      onSend(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = '36px';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      
      const lines = value.split('\n').length;
      const maxHeight = MAX_LINES * LINE_HEIGHT;
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      
      textarea.style.height = `${scrollHeight}px`;
    }
  };

  const emojis = [
    '😀', '😄', '😆', '😅', '🤣', '🙂', '😊', '😷', '😴', '🤗',
    '🥰', '😍', '😘', '😛', '😎', '🤓', '😔', '', '🤪', '😝',
    '🤭', '🤫', '🤐', '🤨', '😐', '😏', '😒', '🙄', '😬', '😮‍💨',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '💕', '☀️', '🌤️', '☁️', '🌦️', '🌧️', '⛈️', '❄️', '🔥', '💧',
  ];

  return (
    <div className={`border-t px-2 py-2 sm:px-4 sm:py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {selectedImage && (
        <div className="mb-2 flex items-center space-x-2">
          <div className="relative">
            <img src={selectedImage} alt="预览" className="h-20 w-auto rounded-lg object-cover" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {hasMessages && (
          <button
            onClick={onSave}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
            }`}
            title="保存聊天记录"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
            }`}
            title="切换左侧面板"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${
            isDarkMode ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
          }`}
          title="上传图片"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
            }`}
            title="表情"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {showEmoji && (
            <div className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-lg border grid grid-cols-10 gap-7 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`}>
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(emoji)}
                  className={`text-xl p-1 rounded transition-colors ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowEmoji(false)}
            placeholder={isBanned ? '您已被禁言，无法发送消息' : '输入消息...'}
            disabled={disabled || isBanned}
            rows={1}
            className={`flex-1 outline-none resize-none overflow-y-auto ${
              isDarkMode
                ? 'bg-gray-700 text-white placeholder-gray-400'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400'
            } ${disabled || isBanned ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              minHeight: '36px', 
              maxHeight: `${MAX_LINES * LINE_HEIGHT}px`, 
              lineHeight: `${LINE_HEIGHT}px`,
              fontSize: `${fontSize}px`
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && !selectedImage) || disabled}
            className={`ml-1 p-1.5 rounded-full transition-all duration-200 ${
              (input.trim() || selectedImage) && !disabled
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                : `${isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
