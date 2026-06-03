import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Edit3, User, Mail, Lock, AlertCircle, CheckCircle, Settings, Download, RefreshCw, Upload, Database } from 'lucide-react';
import { User as UserType } from '../../types/auth';
import { getAllUsers, updateUser, deleteUser, saveUser, getChatHistoryByUserId, getMessagesByChatId, getTodosByUserId, getBotSettings, exportAllDatabase, importDatabase } from '../../db/indexedDB';

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
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showExportUserModal, setShowExportUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (!confirm(`确定要删除用户 "${userToDelete.username}" 吗？\n\n系统将先导出该用户数据作为备份，然后执行删除操作。`)) return;

    try {
      await handleExportUser(userToDelete);
      
      setTimeout(async () => {
        try {
          await deleteUser(userId);
          setMessage(`用户 "${userToDelete.username}" 已删除，数据已备份`);
          loadUsers();
        } catch (error) {
          setMessage('删除失败');
        }
      }, 500);
    } catch (error) {
      console.error('Failed to export user data before delete:', error);
      if (confirm('导出备份失败，是否仍要删除该用户？')) {
        try {
          await deleteUser(userId);
          setMessage(`用户 "${userToDelete.username}" 已删除（未备份）`);
          loadUsers();
        } catch (error) {
          setMessage('删除失败');
        }
      }
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
      a.download = `sudong_user_${user.username}_data_${getExportDate()}.json`;
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
      const data = await exportAllDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sudong_all_users_data_${getExportDate()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('已导出数据库');
    } catch (error) {
      console.error('Failed to export database:', error);
      setMessage('导出失败');
    }
  };

  const handleImportDatabase = async (file: File) => {
    try {
      const text = await file.text();
      await importDatabase(text);
      setMessage('数据库导入成功，请刷新页面');
      setShowImportModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to import database:', error);
      setMessage('导入失败');
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('警告：此操作将清空所有数据库数据！\n\n系统将先自动导出当前数据库备份，然后清空所有数据。\n\n确定继续吗？')) {
      return;
    }

    try {
      await handleExportAll();
      
      setTimeout(async () => {
        try {
          const emptyData = JSON.stringify({
            users: [],
            bot_settings: [],
            chat_history: [],
            messages: [],
            todos: [],
            admin_users: [{
              id: 'admin',
              username: 'admin',
              password: 'admin123',
              createdAt: new Date().toISOString()
            }]
          });
          await importDatabase(emptyData);
          setMessage('数据库已清空并初始化');
          loadUsers();
        } catch (error) {
          console.error('Failed to clear database:', error);
          setMessage('清空失败');
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to backup before clearing:', error);
      setMessage('备份失败，已取消清空操作');
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
            <h2 className="text-xl font-bold text-gray-800">{t('adminPanel')}</h2>
            <p className="text-sm text-gray-500">{t('manageAllUsersAndSettings')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm">{t('changePassword')}</span>
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">{t('exportDatabase')}</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">{t('importDatabase')}</span>
            </button>
            <button
              onClick={handleClearDatabase}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm">{t('clearDatabase')}</span>
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
              message.includes(t('success')) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              {message}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{t('totalUsers', { count: users.length })}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{t('addUser')}</span>
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
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{t('deactivated')}</span>
                        )}
                        {user.isBanned && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">{t('banned')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openExportModal(user)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('exportUserData')}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                      title={t('edit')}
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
                      title={user.isActive ? t('deactivate') : t('activate')}
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
                      title={user.isBanned ? t('unban') : t('ban')}
                    >
                      <Lock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('delete')}
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
                <h3 className="font-medium text-gray-800">{t('addNewUser')}</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('username')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('password')}</label>
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
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddUser}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">{t('editUserInfo')}</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('username')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('newPasswordLeaveBlank')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder={t('leaveBlankToKeep')}
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
                  {t('cancel')}
                </button>
                <button
                  onClick={handleEditUser}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">{t('changeAdminPassword')}</h3>
              </div>
              {adminMessage && (
                <div className={`px-4 py-2 ${adminMessage.includes(t('success')) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <p className="text-sm">{adminMessage}</p>
                </div>
              )}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('currentPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.currentPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, currentPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder={t('enterCurrentPassword')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('newPassword')}</label>
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.newPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder={t('enterNewPassword')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('confirmNewPassword')}</label>
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={adminPasswordData.confirmPassword}
                      onChange={e => setAdminPasswordData({ ...adminPasswordData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder={t('reEnterNewPassword')}
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
                  {t('cancel')}
                </button>
                <button
                  onClick={handleChangeAdminPassword}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showExportUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">{t('exportUserData')}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('willExportUserData', { username: selectedUser.username })}
                </p>
                <ul className="text-sm text-gray-500 space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>{t('basicInfoPasswordHidden')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>{t('chatHistory')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>{t('todoItems')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>{t('botSettings')}</span>
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
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleExportUser(selectedUser)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  {t('export')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">{t('importDatabase')}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('selectDatabaseBackupFile')}
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportDatabase(file);
                    }
                  }}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600"
                />
                <p className="text-xs text-gray-500 text-center mt-3">
                  {t('selectJsonBackupFile')}
                </p>
              </div>
              <div className="p-4 border-t border-gray-100 flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
