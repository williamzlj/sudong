import { useState, useRef, useEffect, useCallback } from 'react';
import { Todo, TodoStatus } from '../../types/todo';
import { Pin, Check, Trash2, Edit3, Calendar, RotateCcw, FileText, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TodoItemProps {
  todo: Todo;
  onSetStatus: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onTogglePin: (id: string) => void;
  onCopyToPending?: (todo: Todo) => void;
  isDarkMode?: boolean;
  currentLang?: string;
}

export const TodoItem = ({ todo, onSetStatus, onDelete, onUpdate, onTogglePin, onCopyToPending, isDarkMode = false, currentLang = 'zh' }: TodoItemProps) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editNote, setEditNote] = useState(todo.note);
  const [editDeadline, setEditDeadline] = useState(formatDate(todo.deadline));
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const getLocale = () => {
    switch (currentLang) {
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'ko': return 'ko-KR';
      default: return 'zh-CN';
    }
  };

  function formatDate(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  function formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString(getLocale(), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // 兼容不同浏览器的鼠标位置获取
    const x = e.clientX || e.pageX;
    const y = e.clientY || e.pageY;
    setMenuPosition({ x, y });
    
    longPressTimer.current = window.setTimeout(() => {
      setIsLongPress(true);
      setShowMenu(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu, handleClickOutside]);

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
    return todo.status === 'completed' ? t('pending') : t('completed');
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
              <span>{t('markAsCompleted')}</span>
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
              <span>{t('markAsReference')}</span>
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
              <span>{t('markAsPending')}</span>
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
              <span>{t('markAsReference')}</span>
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
              <span>{t('markAsPending')}</span>
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
              <span>{t('markAsCompleted')}</span>
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
              <span>{t('copyToPending')}</span>
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
              <span className="text-xs text-white mt-1">{t('complete')}</span>
            </div>
          </div>
        )}

        <div
          ref={slideRef}
          className={`relative border rounded-lg p-3 sm:p-4 transition-transform cursor-pointer ${
            todo.status === 'completed' ? 'bg-green-50 border-green-200' :
            todo.status === 'reference' ? 'bg-blue-50 border-blue-200' :
            'bg-white border-gray-200'
          } ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (!isLongPress) {
              if (slideRef.current) slideRef.current.style.transform = 'translateX(0)';
            }
            setIsLongPress(false);
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {showEdit ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 ${
                      isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-green-500'
                    }`}
                    autoFocus
                  />
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="备注..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none h-16 ${
                      isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                  />
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                      className={`px-3 py-2 border rounded-lg text-sm outline-none ${
                        isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                    >
                      {t('save')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 flex-wrap">
                    {todo.isPinned && (
                      <Pin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <h3 className={`font-medium flex-1 min-w-0 ${
                      todo.status === 'completed' ? 'text-gray-400 line-through' : isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {todo.title}
                    </h3>
                  </div>
                  {todo.note && (
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {todo.note}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400 flex-wrap">
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
              <div className="flex flex-col sm:flex-row sm:space-x-2 gap-1 sm:gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(todo.id); }}
                    className={`p-2 rounded-lg transition-colors ${
                      todo.isPinned ? 'text-red-500 bg-red-50' : `text-gray-400 hover:text-red-500 hover:bg-red-50 ${isDarkMode ? 'hover:bg-red-900' : ''}`
                    }`}
                    title={todo.isPinned ? t('unpin') : t('pin')}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
                    className={`p-2 rounded-lg transition-colors text-gray-400 hover:text-green-500 hover:bg-green-50 ${isDarkMode ? 'hover:bg-green-900' : ''}`}
                    title={t('edit')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-1">
                  {confirmStatus === todo.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetStatus(todo.id); }}
                        className={`px-2 py-1 text-xs text-white rounded transition-colors ${
                          todo.status === 'completed' 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {t('confirm')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmStatus(null); }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmStatus(todo.id); }}
                      className={`p-2 rounded-lg transition-colors ${
                        todo.status === 'completed' 
                          ? `text-gray-400 hover:text-orange-500 hover:bg-orange-50 ${isDarkMode ? 'hover:bg-orange-900' : ''}` 
                          : `text-gray-400 hover:text-green-500 hover:bg-green-50 ${isDarkMode ? 'hover:bg-green-900' : ''}`
                      }`}
                      title={todo.status === 'completed' ? t('markAsPending') : t('markAsCompleted')}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {confirmDelete === todo.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(todo.id); }}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        {t('confirm')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(todo.id); }}
                      className={`p-2 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 ${isDarkMode ? 'hover:bg-red-900' : ''}`}
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="fixed rounded-lg shadow-xl border p-2 z-50 min-w-[140px] bg-white border-gray-200"
          style={{ left: menuPosition.x, top: menuPosition.y }}
        >
          <p className="text-xs mb-2 border-b px-3 py-2 text-gray-500 border-gray-100">{t('longPressActions')}</p>
          {getMenuButtons()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              setConfirmDelete(todo.id);
            }}
            className="w-full text-red-500 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-50 mt-2"
          >
            {t('delete')}
          </button>
        </div>
      )}
    </>
  );
};
