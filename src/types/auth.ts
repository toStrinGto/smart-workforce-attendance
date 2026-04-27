import { Role } from '@/store/useAppStore';

export interface User {
  id: number;
  phone: string;
  name: string;
  role: Role;
  avatar?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
