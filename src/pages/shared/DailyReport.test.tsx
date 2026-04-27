import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import DailyReport from './DailyReport';

const requestMock = vi.fn();
const uploadFilesMock = vi.fn();

vi.mock('@/lib/api', () => ({
  request: (...args: unknown[]) => requestMock(...args),
  uploadFiles: (...args: unknown[]) => uploadFilesMock(...args),
}));

const workerTemplateStorageKey = 'daily-report-worker-templates:1';

type TemplateData = {
  id: number;
  name: string;
  content: string;
  visibility: 'system' | 'personal';
  owner: { id: number; name: string } | null;
  editable: boolean;
  deletable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type HistoryItemData = {
  id: number;
  date: string;
  summary: string;
  content?: string;
  status: string;
  boss?: string;
  reviewer?: string;
  images?: string[];
  templateName?: string;
  templateId?: number;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeTemplate(overrides: Partial<TemplateData>): TemplateData {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? '通用施工日报',
    content: overrides.content ?? '系统模板内容',
    visibility: overrides.visibility ?? 'system',
    owner: overrides.owner ?? null,
    editable: overrides.editable ?? false,
    deletable: overrides.deletable ?? false,
    createdAt: overrides.createdAt ?? '2026-04-23T09:00:00',
    updatedAt: overrides.updatedAt ?? '2026-04-23T09:30:00',
  };
}

describe('DailyReport', () => {
  let templatesData: TemplateData[];
  let historyData: HistoryItemData[];
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    requestMock.mockReset();
    uploadFilesMock.mockReset();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    uploadFilesMock.mockResolvedValue([]);

    templatesData = [
      makeTemplate({
        id: 1,
        name: '通用施工日报',
        content: '系统模板内容',
        visibility: 'system',
        owner: null,
        editable: false,
        deletable: false,
      }),
      makeTemplate({
        id: 2,
        name: '班组长专用模板',
        content: '班组长模板内容',
        visibility: 'personal',
        owner: { id: 2, name: '李班长' },
        editable: true,
        deletable: true,
      }),
    ];

    historyData = [
      {
        id: 101,
        date: '2026-04-21',
        summary: 'cli targeted report',
        content: '完整汇报内容',
        status: 'submitted',
        boss: '王老板',
      },
      {
        id: 102,
        date: '2026-04-18',
        summary: 'reviewed report',
        content: '已阅汇报',
        status: 'reviewed',
        boss: '王老板',
      },
    ];

    requestMock.mockImplementation(async (endpoint: string, options?: RequestInit) => {
      const method = (options?.method || 'GET').toUpperCase();

      if (method === 'GET' && endpoint === '/api/v1/reports/templates') {
        return { code: 200, message: 'success', data: clone(templatesData) };
      }

      if (method === 'GET' && endpoint === '/api/v1/reports/history') {
        return { code: 200, message: 'success', data: clone(historyData) };
      }

      if (method === 'PUT' && endpoint === '/api/v1/reports/101/review') {
        historyData = historyData.map((item) =>
          item.id === 101
            ? {
                ...item,
                status: 'reviewed',
                boss: item.boss || '王老板',
              }
            : item,
        );

        return {
          code: 200,
          message: 'success',
          data: clone(historyData.find((item) => item.id === 101)),
        };
      }

      if (method === 'POST' && endpoint === '/api/v1/reports/templates') {
        const body = JSON.parse(String(options?.body || '{}'));
        const user = useAuthStore.getState().user;
        const created = makeTemplate({
          id: 100 + templatesData.length,
          name: body.name,
          content: body.content,
          visibility: 'personal',
          owner: user ? { id: user.id, name: user.name } : null,
          editable: true,
          deletable: true,
        });
        templatesData = [created, ...templatesData];
        return { code: 200, message: 'success', data: clone(created) };
      }

      const templateMatch = endpoint.match(/^\/api\/v1\/reports\/templates\/(\d+)$/);
      if (method === 'PUT' && templateMatch) {
        const id = Number(templateMatch[1]);
        const body = JSON.parse(String(options?.body || '{}'));
        const index = templatesData.findIndex((item) => item.id === id);
        if (index === -1) throw new Error('模板不存在');
        templatesData[index] = {
          ...templatesData[index],
          name: body.name,
          content: body.content,
          updatedAt: '2026-04-23T10:00:00',
        };
        return { code: 200, message: 'success', data: clone(templatesData[index]) };
      }

      if (method === 'DELETE' && templateMatch) {
        const id = Number(templateMatch[1]);
        templatesData = templatesData.filter((item) => item.id !== id);
        return {
          code: 200,
          message: 'success',
          data: { deleted: true, id },
        };
      }

      if (method === 'POST' && endpoint === '/api/v1/reports') {
        const body = JSON.parse(String(options?.body || '{}'));
        const matchedTemplate = templatesData.find((item) => item.id === body.templateId) || null;
        const report: HistoryItemData = {
          id: 999,
          date: '2026-04-23',
          summary: String(body.content || '').slice(0, 20),
          content: body.content,
          status: 'submitted',
          boss: '王老板',
          templateId: body.templateId,
          templateName: matchedTemplate?.name,
        };
        historyData = [report, ...historyData];
        return { code: 200, message: 'success', data: clone(report) };
      }

      throw new Error(`Unhandled request in test: ${method} ${endpoint}`);
    });

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 2,
        phone: '13800000002',
        name: '李班长',
        role: 'foreman',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  async function renderDailyReport() {
    render(
      <MemoryRouter>
        <DailyReport />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith('/api/v1/reports/templates');
      expect(requestMock).toHaveBeenCalledWith('/api/v1/reports/history');
    });
  }

  it('opens a detail modal from history and marks unread reports as reviewed when closing', async () => {
    await renderDailyReport();

    fireEvent.click(screen.getByText('历史记录'));

    const reportSummary = await screen.findByText('cli targeted report');
    fireEvent.click(reportSummary);

    expect(await screen.findByText('完整汇报内容')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('关闭日报详情'));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/reports/101/review',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('关闭日报详情')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('已阅').length).toBeGreaterThan(0);
  });

  it('shows backend template permissions and refetches templates after a successful delete', async () => {
    await renderDailyReport();

    fireEvent.click(screen.getByText('模板管理'));

    expect(await screen.findByText('系统模板')).toBeInTheDocument();
    expect(screen.getByText('我的模板')).toBeInTheDocument();
    expect(screen.queryByLabelText('删除模板 通用施工日报')).not.toBeInTheDocument();
    expect(screen.getByLabelText('删除模板 班组长专用模板')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('删除模板 班组长专用模板'));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/reports/templates/2',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    await waitFor(() => {
      const templateCalls = requestMock.mock.calls.filter(
        ([endpoint, options]) =>
          endpoint === '/api/v1/reports/templates' &&
          (!options || (options as RequestInit).method === undefined),
      );
      expect(templateCalls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.queryByText('班组长专用模板')).not.toBeInTheDocument();
  });

  it('loads worker templates from the backend and clears legacy worker template storage', async () => {
    localStorage.setItem(
      workerTemplateStorageKey,
      JSON.stringify([{ id: 501, name: '旧本地模板', content: '本地遗留内容' }]),
    );

    templatesData = [
      makeTemplate({
        id: 11,
        name: '工人个人模板',
        content: '工人模板内容',
        visibility: 'personal',
        owner: { id: 1, name: '张三' },
        editable: true,
        deletable: true,
      }),
      makeTemplate({
        id: 12,
        name: '安全巡检模板',
        content: '系统安全内容',
        visibility: 'system',
        owner: null,
        editable: false,
        deletable: false,
      }),
    ];

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 1,
        phone: '13800000001',
        name: '张三',
        role: 'worker',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    await renderDailyReport();

    await screen.findByDisplayValue('工人模板内容');
    expect(requestMock).toHaveBeenCalledWith('/api/v1/reports/templates');
    expect(localStorage.getItem(workerTemplateStorageKey)).toBeNull();

    fireEvent.click(screen.getByText('模板管理'));

    expect(await screen.findByText('系统模板')).toBeInTheDocument();
    expect(screen.getByText('我的模板')).toBeInTheDocument();
    expect(screen.queryByLabelText('删除模板 安全巡检模板')).not.toBeInTheDocument();
    expect(screen.getByLabelText('删除模板 工人个人模板')).toBeInTheDocument();
  });

  it('creates worker templates through the backend and refreshes the list', async () => {
    templatesData = [
      makeTemplate({
        id: 11,
        name: '工人个人模板',
        content: '工人模板内容',
        visibility: 'personal',
        owner: { id: 1, name: '张三' },
        editable: true,
        deletable: true,
      }),
    ];

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 1,
        phone: '13800000001',
        name: '张三',
        role: 'worker',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    await renderDailyReport();

    fireEvent.click(screen.getByText('模板管理'));
    fireEvent.click(screen.getByText('新建日报模板'));

    fireEvent.change(screen.getByPlaceholderText('例如：通用施工日报'), {
      target: { value: '跨设备模板' },
    });
    fireEvent.change(screen.getByPlaceholderText('请输入模板内容...'), {
      target: { value: '后端同步的新模板内容' },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/reports/templates',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      const templateCalls = requestMock.mock.calls.filter(
        ([endpoint, options]) =>
          endpoint === '/api/v1/reports/templates' &&
          (!options || (options as RequestInit).method === undefined),
      );
      expect(templateCalls.length).toBeGreaterThanOrEqual(2);
    });

    expect(await screen.findByText('跨设备模板')).toBeInTheDocument();
  });

  it('submits worker daily reports with templateId from the selected backend template', async () => {
    templatesData = [
      makeTemplate({
        id: 11,
        name: '工人个人模板',
        content: '工人模板内容',
        visibility: 'personal',
        owner: { id: 1, name: '张三' },
        editable: true,
        deletable: true,
      }),
      makeTemplate({
        id: 12,
        name: '安全巡检模板',
        content: '系统安全内容',
        visibility: 'system',
        owner: null,
        editable: false,
        deletable: false,
      }),
    ];

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 1,
        phone: '13800000001',
        name: '张三',
        role: 'worker',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    await renderDailyReport();

    fireEvent.click(screen.getByText('安全巡检模板'));
    fireEvent.click(screen.getByRole('button', { name: /发送汇报/ }));

    await waitFor(() => {
      const submitCall = requestMock.mock.calls.find(
        ([endpoint, options]) =>
          endpoint === '/api/v1/reports' &&
          (options as RequestInit | undefined)?.method === 'POST',
      );

      expect(submitCall).toBeDefined();
      const [, options] = submitCall as [string, RequestInit];
      const body = JSON.parse(String(options.body || '{}'));
      expect(body).toMatchObject({
        content: '系统安全内容',
        images: [],
        templateId: 12,
      });
    });
  });

  it('shows backend errors and refetches templates when a delete fails', async () => {
    templatesData = [
      makeTemplate({
        id: 11,
        name: '工人个人模板',
        content: '工人模板内容',
        visibility: 'personal',
        owner: { id: 1, name: '张三' },
        editable: true,
        deletable: true,
      }),
    ];

    requestMock.mockImplementation(async (endpoint: string, options?: RequestInit) => {
      const method = (options?.method || 'GET').toUpperCase();

      if (method === 'GET' && endpoint === '/api/v1/reports/templates') {
        return { code: 200, message: 'success', data: clone(templatesData) };
      }

      if (method === 'GET' && endpoint === '/api/v1/reports/history') {
        return { code: 200, message: 'success', data: clone(historyData) };
      }

      if (method === 'DELETE' && endpoint === '/api/v1/reports/templates/11') {
        throw new Error('无权限');
      }

      throw new Error(`Unhandled request in test: ${method} ${endpoint}`);
    });

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 1,
        phone: '13800000001',
        name: '张三',
        role: 'worker',
      },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    await renderDailyReport();

    fireEvent.click(screen.getByText('模板管理'));
    fireEvent.click(screen.getByLabelText('删除模板 工人个人模板'));

    expect(await screen.findByText('无权限')).toBeInTheDocument();

    await waitFor(() => {
      const templateCalls = requestMock.mock.calls.filter(
        ([endpoint, options]) =>
          endpoint === '/api/v1/reports/templates' &&
          (!options || (options as RequestInit).method === undefined),
      );
      expect(templateCalls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText('工人个人模板')).toBeInTheDocument();
  });
});
