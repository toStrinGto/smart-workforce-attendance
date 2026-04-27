import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import MobileWorkbench from './Workbench';

const requestMock = vi.fn();

vi.mock('@/lib/api', () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

describe('MobileWorkbench', () => {
  beforeEach(() => {
    localStorage.clear();
    requestMock.mockReset();
    useAppStore.setState({ role: 'boss' });
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 3,
        phone: '13800000003',
        name: '王老板',
        role: 'boss',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });
  });

  it('shows an empty state when backend returns no pending todos', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      message: 'success',
      data: [],
    });

    render(
      <MemoryRouter>
        <MobileWorkbench />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith('/api/v1/todos?status=pending');
    });

    expect(await screen.findByText('暂无待办事项')).toBeInTheDocument();
    expect(screen.getByText('当前没有需要处理的任务')).toBeInTheDocument();
  });
});
