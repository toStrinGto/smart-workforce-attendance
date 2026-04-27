import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response;
}

async function resolveMockDelay<T>(promise: Promise<T>) {
  await vi.advanceTimersByTimeAsync(600);
  return promise;
}

describe('mock worker attendance API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_MOCK_ENABLED', 'true');
    vi.useFakeTimers({ now: new Date('2026-04-21T09:30:00Z') });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/mock/worker-attendance-monthly.json') {
        return jsonResponse({ code: 200, message: 'success', data: {} });
      }
      return jsonResponse({ code: 200, message: 'success', data: {} });
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reflects a worker punch in monthly attendance data', async () => {
    const { request } = await import('./api');

    await resolveMockDelay(request('/api/v1/worker/punch', {
      method: 'POST',
      body: JSON.stringify({
        type: 'in',
        latitude: 31.2304,
        longitude: 121.4737,
      }),
    }));

    const monthly = await resolveMockDelay(request<Record<string, { in: string | null }>>('/api/v1/worker/attendance/monthly?month=2026-04'));

    expect(monthly.data['2026-04-21']?.in).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('mock foreman attendance API', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubEnv('VITE_MOCK_ENABLED', 'true');
    vi.useFakeTimers({ now: new Date('2026-04-23T09:30:00Z') });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/mock/foreman-attendance-monthly.json') {
        return jsonResponse({
          code: 200,
          message: 'success',
          data: {},
        });
      }

      if (url === '/mock/foreman-attendance-today.json') {
        return jsonResponse({
          code: 200,
          message: 'success',
          data: {
            projectId: 1,
            date: '2026-04-23',
            workers: [],
          },
        });
      }

      return jsonResponse({ code: 200, message: 'success', data: {} });
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('persists submitted foreman attendance into today and monthly endpoints across module reloads', async () => {
    const firstApi = await import('./api');

    await resolveMockDelay(firstApi.request('/api/v1/foreman/attendance', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 1,
        records: [
          {
            workerId: 1,
            dayShift: 1,
            overtimeHours: 0,
          },
        ],
      }),
    }));

    const firstToday = await resolveMockDelay(firstApi.request<any>('/api/v1/foreman/attendance/today?projectId=1'));
    expect(firstToday.data.workers).toEqual([
      expect.objectContaining({
        workerId: 1,
        dayShift: 1,
        overtimeHours: 0,
        status: 'recorded',
      }),
    ]);

    const firstMonthly = await resolveMockDelay(firstApi.request<Record<string, any>>('/api/v1/foreman/attendance/monthly?month=2026-04'));
    expect(firstMonthly.data['2026-04-23']).toMatchObject({
      status: 'recorded',
      in: null,
      out: null,
    });

    vi.resetModules();
    vi.stubEnv('VITE_MOCK_ENABLED', 'true');

    const secondApi = await import('./api');
    const secondToday = await resolveMockDelay(secondApi.request<any>('/api/v1/foreman/attendance/today?projectId=1'));

    expect(secondToday.data.workers).toEqual([
      expect.objectContaining({
        workerId: 1,
        dayShift: 1,
        overtimeHours: 0,
        status: 'recorded',
      }),
    ]);
  });
});

describe('mock daily report template API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_MOCK_ENABLED', 'true');
    vi.useFakeTimers({ now: new Date('2026-04-23T09:30:00Z') });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/mock/daily-report-templates.json') {
        return jsonResponse({
          code: 200,
          message: 'success',
          data: [
            {
              id: 1,
              name: '通用施工日报',
              content: '系统模板内容',
              visibility: 'system',
              owner: null,
              editable: false,
              deletable: false,
              createdAt: '2026-04-23T09:00:00',
              updatedAt: '2026-04-23T09:30:00',
            },
            {
              id: 2,
              name: '张三模板',
              content: '工人模板内容',
              visibility: 'personal',
              owner: { id: 1, name: '张三' },
              editable: true,
              deletable: true,
              createdAt: '2026-04-23T09:00:00',
              updatedAt: '2026-04-23T09:30:00',
            },
            {
              id: 3,
              name: '李班长模板',
              content: '班组长模板内容',
              visibility: 'personal',
              owner: { id: 2, name: '李班长' },
              editable: true,
              deletable: true,
              createdAt: '2026-04-23T09:00:00',
              updatedAt: '2026-04-23T09:30:00',
            },
          ],
        });
      }

      if (url === '/mock/daily-report-history.json') {
        return jsonResponse({ code: 200, message: 'success', data: [] });
      }

      return jsonResponse({ code: 200, message: 'success', data: {} });
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns system plus self templates and blocks deleting someone else template', async () => {
    const [{ request }, { useAuthStore }] = await Promise.all([
      import('./api'),
      import('@/store/useAuthStore'),
    ]);

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 1, phone: '13800000001', name: '张三', role: 'worker' },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    const templates = await resolveMockDelay(request<any[]>('/api/v1/reports/templates'));

    expect(templates.data.map((item) => item.name)).toEqual(['通用施工日报', '张三模板']);

    const forbiddenDelete = request('/api/v1/reports/templates/3', { method: 'DELETE' });
    const forbiddenDeleteAssertion = expect(forbiddenDelete).rejects.toMatchObject({
      code: 403,
      message: '无权限',
    });
    await vi.advanceTimersByTimeAsync(600);
    await forbiddenDeleteAssertion;

    const created = await resolveMockDelay(request('/api/v1/reports/templates', {
      method: 'POST',
      body: JSON.stringify({ name: '跨设备模板', content: '新的模板内容' }),
    }));

    expect(created.data).toMatchObject({
      name: '跨设备模板',
      visibility: 'personal',
      owner: { id: 1, name: '张三' },
      editable: true,
      deletable: true,
    });
  });

  it('validates template visibility on report submit and returns template identity', async () => {
    const [{ request }, { useAuthStore }] = await Promise.all([
      import('./api'),
      import('@/store/useAuthStore'),
    ]);

    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 1, phone: '13800000001', name: '张三', role: 'worker' },
      isAuthenticated: true,
      _hasHydrated: true,
    });

    const foreignSubmit = request('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({
        content: 'foreign template report',
        images: [],
        templateId: 3,
      }),
    });
    const foreignSubmitAssertion = expect(foreignSubmit).rejects.toMatchObject({
      code: 403,
      message: '无权限使用该模板',
    });
    await vi.advanceTimersByTimeAsync(600);
    await foreignSubmitAssertion;

    const submitted = await resolveMockDelay(request('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({
        content: 'own template report',
        images: [],
        templateId: 2,
      }),
    }));

    expect(submitted.data).toMatchObject({
      templateId: 2,
      templateName: '张三模板',
    });
  });
});
