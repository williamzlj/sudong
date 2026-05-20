import { useState, useMemo } from 'react';
import { Todo, TodoStatus } from '../../types/todo';
import { TodoItem } from './TodoItem';
import { TodoModal } from './TodoModal';
import { Plus, CheckCircle, Circle, FileText, ArrowUpDown, Menu, X } from 'lucide-react';

type TabType = 'pending' | 'completed' | 'reference';
type SortField = 'createdAt' | 'completedAt';
type SortOrder = 'asc' | 'desc';

interface TodoListProps {
  pendingTodos: Todo[];
  completedTodos: Todo[];
  referenceTodos: Todo[];
  onAdd: (title: string, note: string, deadline: Date) => void;
  onSetStatus: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onTogglePin: (id: string) => void;
  onCopyToPending: (todo: Todo) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  isDarkMode?: boolean;
}

export const TodoList = ({
  pendingTodos,
  completedTodos,
  referenceTodos,
  onAdd,
  onSetStatus,
  onDelete,
  onUpdate,
  onTogglePin,
  onCopyToPending,
  sidebarVisible,
  onToggleSidebar,
  isDarkMode = false
}: TodoListProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const currentTodos = useMemo(() => {
    const todos = activeTab === 'pending' ? pendingTodos :
                  activeTab === 'completed' ? completedTodos : referenceTodos;
    
    return [...todos].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      
      const dateA = sortField === 'createdAt' ? new Date(a.createdAt).getTime() : 
                    (a.completedAt ? new Date(a.completedAt).getTime() : 0);
      const dateB = sortField === 'createdAt' ? new Date(b.createdAt).getTime() : 
                    (b.completedAt ? new Date(b.completedAt).getTime() : 0);
      const dateComparison = dateA - dateB;
      
      return sortOrder === 'asc' ? dateComparison : -dateComparison;
    });
  }, [activeTab, pendingTodos, completedTodos, referenceTodos, sortField, sortOrder]);

  const toggleSort = () => {
    if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('asc');
      setSortField(sortField === 'createdAt' ? 'completedAt' : 'createdAt');
    }
  };

  const getTabInfo = () => {
    switch (activeTab) {
      case 'pending':
        return { label: '待办事项', count: pendingTodos.length, icon: Circle, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' };
      case 'completed':
        return { label: '已完成', count: completedTodos.length, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-500' };
      case 'reference':
        return { label: '参考事项', count: referenceTodos.length, icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' };
    }
  };

  const tabInfo = getTabInfo();
  const IconComponent = tabInfo.icon;

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-lg transition-colors text-gray-500 hover:text-green-500 hover:bg-green-50"
            >
              {sidebarVisible ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-2">
              <IconComponent className={tabInfo.color} style={{ width: '20px', height: '20px' }} />
              <h2 className="text-gray-800 font-medium">{tabInfo.label}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs ${tabInfo.bgColor} ${tabInfo.color}`}>
                {tabInfo.count}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSort}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title={`按${sortField === 'createdAt' ? '创建时间' : '完成时间'}${sortOrder === 'asc' ? '升序' : '降序'}排序`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-xs">
                {sortField === 'createdAt' ? '创建时间' : '完成时间'}
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">添加</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${activeTab === 'pending' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Circle className="w-4 h-4" />
          <span>待办 ({pendingTodos.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>已完成 ({completedTodos.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reference')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${activeTab === 'reference' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText className="w-4 h-4" />
          <span>参考 ({referenceTodos.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {currentTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <IconComponent className="w-8 h-8" />
            </div>
            <p className="text-sm">
              {activeTab === 'pending' ? '暂无待办事项' : 
               activeTab === 'completed' ? '暂无已完成事项' : '暂无参考事项'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onSetStatus={onSetStatus}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onTogglePin={onTogglePin}
                onCopyToPending={activeTab === 'reference' ? onCopyToPending : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <TodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAdd}
      />
    </div>
  );
};
