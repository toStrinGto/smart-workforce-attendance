import { request } from '@/lib/api';
import { LoginRequest, LoginResponse, RefreshResponse } from '@/types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};
