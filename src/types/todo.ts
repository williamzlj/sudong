export type TodoStatus = 'pending' | 'completed' | 'reference';

export interface Todo {
  id: string;
  userId: string;
  title: string;
  note: string;
  createdAt: Date;
  deadline: Date;
  isPinned: boolean;
  status: TodoStatus;
}

export interface TodoState {
  todos: Todo[];
}
