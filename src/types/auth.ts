export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  avatar: string;
  userNameColor?: string;
  isActive?: boolean;
  isBanned?: boolean;
  role?: string;
  createdAt: Date;
}

export interface BotSettings {
  name: string;
  avatar: string;
  defaultReply: string;
  productName: string;
  productDescription: string;
  chatHint: string;
  chatBackgroundText: string;
  fontSize?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  password?: string;
  avatar?: string;
  userNameColor?: string;
  currentPassword?: string;
}
