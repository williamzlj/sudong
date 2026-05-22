import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit3, User, Mail, Lock, AlertCircle, CheckCircle, Settings, Download, RefreshCw } from 'lucide-react';
import { User as UserType } from '../../types/auth';
import { getAllUsers, updateUser, deleteUser, saveUser, getChatHistoryByUserId, getMessagesByChatId, getTodosByUserId, getBotSettings, exportDatabase } from '../../db/indexedDB';

interface AdminPanelProps {
  onClose: () => void;
}

const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const getExportDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showExportUserModal, setShowExportUserModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [adminPasswordData, setAdminPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      setMessage('请填写所有字段');
      return;
    }

    try {
      const newUser: UserType = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        username: formData.username,
        email: formData.email,
        password: hashPassword(formData.password),
        avatar: 'bg-blue-500',
        isActive: true,
        isBanned: false,
        role: 'user',
        createdAt: new Date(),
      };

      await saveUser(newUser);
      setMessage('用户添加成功');
      setShowAddModal(false);
      setFormData({ username: '', email: '', password: '' });
      loadUsers();
    } catch (error) {
      setMessage('添加失败，邮箱可能已存在');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const updates: Partial<UserType> = {};
      if (editFormData.username) updates.username = editFormData.username;
      if (editFormData.email) updates.email = editFormData.email;
      if (editFormData.password) updates.password = hashPassword(editFormData.password);

      await updateUser(selectedUser.id, updates);
      setMessage('用户信息已更新');
      setShowEditModal(false);
      setEditFormData({ username: '', email: '', password: '' });
      loadUsers();
    } catch (error) {
      setMessage('更新失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return;

    try {
      await deleteUser(userId);
      setMessage('用户已删除');
      loadUsers();
    } catch (error) {
      setMessage('删除失败');
    }
  };

  const handleToggleActive = async (user: UserType) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      loadUsers();
    } catch (error) {
      setMessage('操作失败');
    }
  };

  const handleToggleBanned = async (user: UserType) => {
    try {
      await updateUser(user.id, { isBanned: !user.isBanned });
      loadUsers();
    } catch (error) {
      setMessage('操作失败');
    }
  };

  const handleChangeAdminPassword = async () => {
    if (!adminPasswordData.currentPassword || !adminPasswordData.newPassword || !adminPasswordData.confirmPassword) {
      setAdminMessage('请填写所有字段');
      return;
    }

    if (adminPasswordData.newPassword !== adminPasswordData.confirmPassword) {
      setAdminMessage('新密码与确认密码不一致');
      return;
    }

    if (adminPasswordData.currentPassword !== 'admin123') {
      setAdminMessage('当前密码不正确');
      return;
    }

    localStorage.setItem('admin_password', hashPassword(adminPasswordData.newPassword));
    setAdminMessage('密码修改成功，请使用新密码登录');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setAdminPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAdminMessage('');
    }, 2000);
  };

  const handleExportUser = async (user: UserType) => {
    try {
      const chatHistory = await getChatHistoryByUserId(user.id);
      const messages: any[] = [];
      for (const chat of chatHistory) {
        const chatMessages = await getMessagesByChatId(chat.id);
        messages.push(...chatMessages.map(m => ({ ...m, chatId: chat.id, chatTitle: chat.title })));
      }
      
      const todos = await getTodosByUserId(user.id);
      const botSettings = await getBotSettings(user.id);

      const userData = {
        user: { ...user, password: '***' },
        chatHistory,
        messages,
        todos,
        botSettings,
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_${user.username}_data_${getExportDate()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage(`已导出用户 ${user.username} 的数据`);
      setShowExportUserModal(false);
    } catch (error) {
      console.error('Failed to export user data:', error);
      setMessage('导出失败');
    }
  };

  const handleExportAll = async () => {
    try {
      const data = await exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_users_data_${getExportDate()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('已导出所有用户数据');
    } catch (error) {
      console.error('Failed to export all data:', error);
      setMessage('导出失败');
    }
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    setEditFormData({ username: user.username, email: user.email, password: '' });
    setShowEditModal(true);
  };

  const openExportModal = (user: UserType) => {
    setSelectedUser(user);
    setShowExportUserModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">管理员面板</h2>
            <p className="text-sm text-gray-500">管理所有用户和系统设置</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm">修改密码</span>
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">导出全部数据</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {message && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
              message.includes('成功') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              {message}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">共 {users.length} 个用户</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">添加用户</span>
            </button>
          </div>

          <div className="space-y-3">
            {users.map(user => (
              <div
                key={user.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${user.avatar.startsWith('data:') ? 'bg-gray-200' : user.avatar} rounded-full flex items-center justify-center overflow-hidden`}>
                      {user.avatar.startsWith('data:') ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {!user.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">已停用</span>
                        )}
                        {user.isBanned && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">已禁言</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openExportModal(user)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="导出用户数据"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isActive 
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' 
                          : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                      }`}
                      title={user.isActive ? '停用' : '启用'}
                    >
                      {user.isActive ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleToggleBanned(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isBanned 
                          ? 'text-orange-500 hover:bg-orange-50' 
                          : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                      }`}
                      title={user.isBanned ? '解除禁言' : '禁言'}
                    >
                      <Lock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-3" />
              <p>暂无用户</p>
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">添加新用户</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex space-x-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ username: '', email: '', password: '' });
                    setMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddUser}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">编辑用户信息</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={editFormData.username}
                      onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新密码（留空则不修改）</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="留空不修改"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditFormData({ username: '', email: '', password: '' });
                    setMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleEditUser}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">修改管理员密码</h3>
              </div>
              {adminMessage && (
                <div className={`px-4 py-2 ${adminMessage.includes('成功') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <p className="text-sm">{adminMessage}</p>
                </div>
              )}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.currentPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, currentPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="输入当前密码"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.newPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="输入新密码"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.confirmPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="再次输入新密码"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex space-x-3">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setAdminPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setAdminMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleChangeAdminPassword}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {showExportUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">导出用户数据</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  将导出用户 <span className="font-medium">{selectedUser.username}</span> 的所有数据，包括：
                </p>
                <ul className="text-sm text-gray-500 space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>用户基本信息（密码将被隐藏）</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>聊天记录</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>待办事项</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>机器人设置</span>
                  </li>
                </ul>
              </div>
              <div className="p-4 border-t border-gray-100 flex space-x-3">
                <button
                  onClick={() => {
                    setShowExportUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleExportUser(selectedUser)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  导出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
