import { useState, useRef } from 'react';
import { User as UserType, BotSettings } from '../../types/auth';
import { Eye, EyeOff, UserIcon, Lock, Mail, Save, LogOut, X, Camera, Bot, Edit3, MessageSquare, Minus, Plus } from 'lucide-react';
import { ImageManager } from './ImageManager';

interface ProfileSettingsProps {
  user: UserType;
  botSettings: BotSettings;
  onUpdate: (data: { username?: string; email?: string; password?: string; avatar?: string; currentPassword?: string }) => { success: boolean; message: string };
  onUpdateBot: (settings: Partial<BotSettings>) => void;
  onLogout: () => void;
  onClose: () => void;
}

const avatarColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
  'bg-pink-500', 'bg-red-500', 'bg-cyan-500', 'bg-indigo-500'
];

const userNameColors = [
  { name: '蓝色', value: 'text-blue-500', color: '#3b82f6' },
  { name: '绿色', value: 'text-green-500', color: '#22c55e' },
  { name: '紫色', value: 'text-purple-500', color: '#a855f7' },
  { name: '橙色', value: 'text-orange-500', color: '#f97316' },
  { name: '粉色', value: 'text-pink-500', color: '#ec4899' },
  { name: '红色', value: 'text-red-500', color: '#ef4444' },
  { name: '青色', value: 'text-cyan-500', color: '#06b6d4' },
  { name: '靛蓝', value: 'text-indigo-500', color: '#6366f1' },
  { name: '黑色', value: 'text-black', color: '#000000' },
  { name: '深灰色', value: 'text-gray-600', color: '#4b5563' },
];

export const ProfileSettings = ({ user, botSettings, onUpdate, onUpdateBot, onLogout, onClose }: ProfileSettingsProps) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'bot' | 'images'>('profile');
  const [botName, setBotName] = useState(botSettings.name);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || 'bg-blue-500');
  const [selectedBotAvatar, setSelectedBotAvatar] = useState(botSettings.avatar || 'bg-green-500');
  const [botDefaultReply, setBotDefaultReply] = useState(botSettings.defaultReply || '收到！');
  const [selectedUserNameColor, setSelectedUserNameColor] = useState(user.userNameColor || 'text-blue-500');
  const [productName, setProductName] = useState(botSettings.productName || '树洞小助手');
  const [productDescription, setProductDescription] = useState(botSettings.productDescription || '倾诉你的心声');
  const [chatHint, setChatHint] = useState(botSettings.chatHint || '你的秘密很安全');
  const [chatBackgroundText, setChatBackgroundText] = useState(botSettings.chatBackgroundText || '说出你的心里话吧，我会认真倾听');
  const [fontSize, setFontSize] = useState(botSettings.fontSize || 14);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const botFileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = onUpdate({
      username: username !== user.username ? username : undefined,
      email: email !== user.email ? email : undefined,
      avatar: selectedAvatar !== user.avatar ? selectedAvatar : undefined,
      userNameColor: selectedUserNameColor !== user.userNameColor ? selectedUserNameColor : undefined,
    });

    if (result.success) {
      setSuccess('个人资料已更新');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度至少需要6位');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = onUpdate({
      password: newPassword,
      currentPassword,
    });

    if (result.success) {
      setSuccess('密码已修改');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleBotSettings = async () => {
    setError('');
    setSuccess('');
    try {
      await onUpdateBot({ 
        name: botName, 
        avatar: selectedBotAvatar, 
        defaultReply: botDefaultReply,
        productName,
        productDescription,
        chatHint,
        chatBackgroundText,
        fontSize,
      });
      setSuccess('机器人设置已更新');
    } catch (err) {
      console.error('Failed to update bot settings:', err);
      setError('保存失败，请重试');
    }
  };

  const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(resizedDataUrl);
              } else {
                reject(new Error('Failed to get canvas context'));
              }
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target?.result as string;
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resizedImage = await resizeImage(file, 128);
      setSelectedAvatar(resizedImage);
    }
  };

  const handleBotAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file, 128);
        setSelectedBotAvatar(resizedImage);
      } catch (error) {
        console.error('Failed to resize image:', error);
        setError('头像处理失败，请重试');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">设置</h2>
            <p className="text-sm text-gray-500">管理你的账户和机器人设置</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            账户设置
          </button>
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'bot' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            机器人设置
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'images' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            图片管理
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className={`w-20 h-20 ${selectedAvatar.startsWith('data:') ? 'bg-gray-200' : selectedAvatar} rounded-full flex items-center justify-center shadow-lg overflow-hidden`}>
                    {selectedAvatar.startsWith('data:') ? (
                      <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">点击更换头像</p>
                
                <div className="flex space-x-2 mt-3">
                  {avatarColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedAvatar(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedAvatar === color ? 'ring-2 ring-green-500 ring-offset-2 scale-110' : 'hover:scale-110'
                      } ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名颜色</label>
                <div className="flex flex-wrap gap-2">
                  {userNameColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedUserNameColor(color.value)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedUserNameColor === color.value
                          ? 'ring-2 ring-green-500 ring-offset-2 bg-gray-100'
                          : 'hover:bg-gray-50'
                      }`}
                      style={{ color: color.color }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color.color }}
                      />
                      <span>{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? '保存中...' : '保存个人资料'}</span>
              </button>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-medium text-gray-700 mb-4">修改密码</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">当前密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="请输入当前密码"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="新密码（至少6位）"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">确认新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="再次输入新密码"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? '修改中...' : '修改密码'}</span>
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                onClick={onLogout}
                className="w-full bg-gray-100 text-red-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </button>
            </div>
          ) : activeTab === 'bot' ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className={`w-20 h-20 ${selectedBotAvatar.startsWith('data:') ? 'bg-gray-200' : selectedBotAvatar} rounded-full flex items-center justify-center shadow-lg overflow-hidden`}>
                    {selectedBotAvatar.startsWith('data:') ? (
                      <img src={selectedBotAvatar} alt="Bot Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => botFileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={botFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBotAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">点击更换机器人头像</p>
                
                <div className="flex space-x-2 mt-3">
                  {avatarColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedBotAvatar(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedBotAvatar === color ? 'ring-2 ring-green-500 ring-offset-2 scale-110' : 'hover:scale-110'
                      } ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">机器人名称</label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={botName}
                    onChange={e => setBotName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="输入机器人名称"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">机器人默认回复</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={botDefaultReply}
                    onChange={e => setBotDefaultReply(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="输入机器人默认回复"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-medium text-gray-700 mb-4">产品设置</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品名称</label>
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="输入产品名称"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品介绍</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={productDescription}
                      onChange={e => setProductDescription(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="输入产品介绍"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">聊天提示</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={chatHint}
                      onChange={e => setChatHint(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="输入聊天提示"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">聊天背景文字</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={chatBackgroundText}
                      onChange={e => setChatBackgroundText(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="输入聊天背景文字"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">字体大小</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 text-center text-lg font-medium text-gray-800">
                      {fontSize}px
                    </div>
                    <button
                      onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">范围：12px - 32px</p>
                </div>
              </div>

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                onClick={handleBotSettings}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>保存机器人设置</span>
              </button>
            </div>
          ) : activeTab === 'images' ? (
            <ImageManager userId={user.id} isDarkMode={false} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
