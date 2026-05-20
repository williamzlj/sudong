import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoStatus } from '../types/todo';
import { saveTodo, getTodosByUserId, deleteTodo as dbDeleteTodo } from '../db/indexedDB';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useTodo = (userId: string | null) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const loadTodos = async () => {
      if (!userId) {
        setTodos([]);
        return;
      }
      try {
        const userTodos = await getTodosByUserId(userId);
        setTodos(userTodos.map(todo => ({
          ...todo,
          status: (todo.status || 'pending') as TodoStatus
        })));
      } catch (error) {
        console.error('Failed to load todos:', error);
        setTodos([]);
      }
    };

    loadTodos();
  }, [userId]);

  useEffect(() => {
    const persistTodos = async () => {
      if (!userId || todos.length === 0) return;
      for (const todo of todos) {
        try {
          await saveTodo(todo);
        } catch (error) {
          console.error('Failed to save todo:', error);
        }
      }
    };

    if (todos.length > 0) {
      persistTodos();
    }
  }, [todos, userId]);

  const addTodo = useCallback((title: string, note: string, deadline: Date) => {
    if (!userId) return;
    
    const newTodo: Todo = {
      id: generateId(),
      userId,
      title,
      note,
      createdAt: new Date(),
      deadline: deadline || new Date(),
      isPinned: false,
      status: 'pending',
    };
    setTodos(prev => [newTodo, ...prev]);
  }, [userId]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    );
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await dbDeleteTodo(id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  const setStatus = useCallback((id: string, status: TodoStatus) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, status } : todo
      )
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, isPinned: !todo.isPinned } : todo
      )
    );
  }, []);

  const createFromMessage = useCallback((content: string) => {
    if (!userId) return;
    
    const newTodo: Todo = {
      id: generateId(),
      userId,
      title: content,
      note: '',
      createdAt: new Date(),
      deadline: new Date(),
      isPinned: false,
      status: 'pending',
    };
    setTodos(prev => [newTodo, ...prev]);
    return newTodo;
  }, [userId]);

  const copyToPending = useCallback((todo: Todo) => {
    if (!userId) return;
    
    const newTodo: Todo = {
      id: generateId(),
      userId,
      title: todo.title,
      note: todo.note,
      createdAt: new Date(),
      deadline: todo.deadline,
      isPinned: false,
      status: 'pending',
    };
    setTodos(prev => [newTodo, ...prev]);
  }, [userId]);

  const pendingTodos = todos
    .filter(todo => todo.status === 'pending')
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completedTodos = todos
    .filter(todo => todo.status === 'completed')
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const referenceTodos = todos
    .filter(todo => todo.status === 'reference')
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return {
    todos,
    pendingTodos,
    completedTodos,
    referenceTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    setStatus,
    togglePin,
    createFromMessage,
    copyToPending,
  };
};
