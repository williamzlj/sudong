import { TreePine, History, Plus, Settings, Moon, Sun, Info, User, ListTodo, Shield } from 'lucide-react';
import { useState } from 'react';
import { User as UserType, BotSettings } from '../types/auth';

interface SidebarProps {
  activeTab: 'chat' | 'history' | 'todo';
  onTabChange: (tab: 'chat' | 'history' | 'todo') => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  user: UserType;
  botSettings: BotSettings;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar = ({ activeTab, onTabChange, onNewChat, onOpenSettings, onOpenAdmin, user, botSettings, isDarkMode, onToggleDarkMode }: SidebarProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`w-64 border-r flex flex-col h-full transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{botSettings.productName || '树洞'}</h1>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>{botSettings.productDescription || '倾诉你的心声'}</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">新的聊天</span>
        </button>
      </div>

      <div className={`flex-1 px-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className={`grid grid-cols-2 gap-2 rounded-xl p-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => onTabChange('chat')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 ${
              activeTab === 'chat'
                ? `${isDarkMode ? 'bg-gray-600 text-green-400' : 'bg-white shadow-sm text-green-600'}`
                : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <TreePine className="w-8 h-8" />
            <span className="text-sm font-medium mt-2">聊天</span>
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 ${
              activeTab === 'history'
                ? `${isDarkMode ? 'bg-gray-600 text-green-400' : 'bg-white shadow-sm text-green-600'}`
                : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <History className="w-8 h-8" />
            <span className="text-sm font-medium mt-2">记录</span>
          </button>
          <button
            onClick={() => onTabChange('todo')}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 ${
              activeTab === 'todo'
                ? `${isDarkMode ? 'bg-gray-600 text-green-400' : 'bg-white shadow-sm text-green-600'}`
                : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <ListTodo className="w-8 h-8" />
            <span className="text-sm font-medium mt-2">待办</span>
          </button>
        </div>
      </div>

      <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-gray-200">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            user.avatar && user.avatar.startsWith('data:') ? 'bg-gray-200 overflow-hidden' : (user.avatar || 'bg-blue-500')
          }`}>
            {user.avatar && user.avatar.startsWith('data:') ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {user.username}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="关于"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenAdmin}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="管理员"
          >
            <Shield className="w-5 h-5" />
          </button>
        </div>
        {showInfo && (
          <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              树洞是一个安全的匿名聊天空间，您可以放心倾诉心事。所有聊天记录仅保存在本地浏览器管理的IndexedDB数据库中，服务器端不保存用户的任何数据。清空浏览器缓存时会清空数据库！请及时导出和保存数据！使用时请退出无痕浏览模式，因为无痕浏览模式退出时每次都会清空缓存。本软件由ZLJ开发。2026.5
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
