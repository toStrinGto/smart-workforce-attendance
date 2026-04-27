/**
 * useAppStore.ts
 * 全局状态管理文件 (基于 Zustand)。
 * 负责存储和管理全局状态，例如当前登录用户的角色 (role)，并支持状态持久化 (localStorage)。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'worker' | 'foreman' | 'admin' | 'boss';

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: 'worker',
      setRole: (role) => set({ role }),
    }),
    {
      name: 'app-role-storage',
    }
  )
);
