import { useState, useRef } from 'react';
import { Todo, TodoStatus } from '../../types/todo';
import { Pin, Check, Trash2, Edit3, Calendar, RotateCcw, FileText, Copy } from 'lucide-react';

interface TodoItemProps {
  todo: Todo;
  onSetStatus: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onTogglePin: (id: string) => void;
  onCopyToPending?: (todo: Todo) => void;
}

export const TodoItem = ({ todo, onSetStatus, onDelete, onUpdate, onTogglePin, onCopyToPending }: TodoItemProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editNote, setEditNote] = useState(todo.note);
  const [editDeadline, setEditDeadline] = useState(formatDate(todo.deadline));
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  function formatDate(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  function formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      if (slideRef.current) {
        const rect = slideRef.current.getBoundingClientRect();
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

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    longPressTimer.current = setTimeout(() => {
      if (slideRef.current) {
        const rect = slideRef.current.getBoundingClientRect();
        setMenuPosition({
          x: rect.right - 100,
          y: rect.top + 10,
        });
        setShowMenu(true);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    currentX.current = diff;
    if (slideRef.current && todo.status === 'pending') {
      if (diff < -30) {
        slideRef.current.style.transform = `translateX(${Math.max(diff, -80)}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (currentX.current < -60 && todo.status === 'pending') {
      onSetStatus(todo.id, 'completed');
    } else {
      if (slideRef.current) {
        slideRef.current.style.transform = 'translateX(0)';
      }
    }
    currentX.current = 0;
  };

  const handleSaveEdit = () => {
    onUpdate(todo.id, {
      title: editTitle,
      note: editNote,
      deadline: new Date(editDeadline),
    });
    setShowEdit(false);
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditNote(todo.note);
    setEditDeadline(formatDate(todo.deadline));
    setShowEdit(false);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDelete(null);
  };

  const handleSetStatus = (id: string) => {
    const targetStatus = todo.status === 'completed' ? 'pending' : 'completed';
    onSetStatus(id, targetStatus);
    setConfirmStatus(null);
  };

  const getTargetStatusLabel = () => {
    return todo.status === 'completed' ? '未完成' : '已完成';
  };

  const getStatusBadge = () => {
    switch (todo.status) {
      case 'completed':
        return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">已完成</span>;
      case 'reference':
        return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">参考</span>;
      default:
        return null;
    }
  };

  const getMenuButtons = () => {
    switch (todo.status) {
      case 'pending':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'completed');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-green-600"
            >
              <Check className="w-4 h-4" />
              <span>改为完成</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'reference');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-blue-600"
            >
              <FileText className="w-4 h-4" />
              <span>改为参考</span>
            </button>
          </>
        );
      case 'completed':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'pending');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-orange-600"
            >
              <RotateCcw className="w-4 h-4" />
              <span>改为未完成</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'reference');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-blue-600"
            >
              <FileText className="w-4 h-4" />
              <span>改为参考</span>
            </button>
          </>
        );
      case 'reference':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'pending');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-orange-600"
            >
              <RotateCcw className="w-4 h-4" />
              <span>改为未完成</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(todo.id, 'completed');
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-green-600"
            >
              <Check className="w-4 h-4" />
              <span>改为完成</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyToPending && onCopyToPending(todo);
                setShowMenu(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 text-purple-600"
            >
              <Copy className="w-4 h-4" />
              <span>复制到待办</span>
            </button>
          </>
        );
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-lg">
        {todo.status === 'pending' && (
          <div
            className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-green-500"
            onClick={() => onSetStatus(todo.id, 'completed')}
          >
            <div className="flex flex-col items-center">
              <Check className="w-6 h-6 text-white" />
              <span className="text-xs text-white mt-1">完成</span>
            </div>
          </div>
        )}

        <div
          ref={slideRef}
          className={`relative border rounded-lg p-4 transition-transform cursor-pointer ${
            todo.status === 'completed' ? 'bg-green-50 border-green-200' :
            todo.status === 'reference' ? 'bg-blue-50 border-blue-200' :
            'bg-white border-gray-200'
          }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            setShowMenu(false);
            if (slideRef.current) slideRef.current.style.transform = 'translateX(0)';
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {showEdit ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-green-500 rounded-lg text-sm outline-none"
                    autoFocus
                  />
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="备注..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none h-16"
                  />
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                      className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    {todo.isPinned && (
                      <Pin className="w-4 h-4 text-red-500" />
                    )}
                    {getStatusBadge()}
                    <h3 className={`font-medium ${
                      todo.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}>
                      {todo.title}
                    </h3>
                  </div>
                  {todo.note && (
                    <p className="text-sm text-gray-500 mt-1">{todo.note}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                    <span>{formatDateTime(todo.createdAt)}</span>
                    {todo.deadline && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateTime(todo.deadline)}</span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {!showEdit && (
              <div className="flex space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onTogglePin(todo.id); }}
                  className={`p-2 rounded-lg transition-colors ${
                    todo.isPinned ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title={todo.isPinned ? '取消置顶' : '置顶'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
                  className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {confirmStatus === todo.id ? (
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetStatus(todo.id); }}
                      className={`px-2 py-1 text-xs text-white rounded hover:transition-colors ${
                        todo.status === 'completed' 
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      确认
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmStatus(null); }}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmStatus(todo.id); }}
                    className={`p-2 rounded-lg transition-colors ${
                      todo.status === 'completed' 
                        ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' 
                        : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                    }`}
                    title={todo.status === 'completed' ? '标记为未完成' : '标记为已完成'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {confirmDelete === todo.id ? (
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(todo.id); }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      确认
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(todo.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMenu && (
        <div
          className="fixed rounded-lg shadow-xl border p-2 z-50 min-w-[140px] bg-white border-gray-200"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={handleCloseMenu}
        >
          <p className="text-xs mb-2 border-b px-3 py-2 text-gray-500 border-gray-100">长按操作</p>
          {getMenuButtons()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              setConfirmDelete(todo.id);
            }}
            className="w-full text-red-500 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-50 mt-2"
          >
            删除
          </button>
        </div>
      )}
    </>
  );
};
