import { ApiResponse } from '@/types/api';
import { RefreshResponse } from '@/types/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { logger } from '@/lib/logger';
import { SystemSettings, DEFAULT_SETTINGS } from '@/types/models';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const IS_MOCK = import.meta.env.VITE_MOCK_ENABLED === 'true';

export class RequestError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'RequestError';
  }
}

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
}

// --- Token refresh queue (prevents concurrent refresh requests) ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('No refresh token');

  const url = BASE_URL.startsWith('http') ? `${BASE_URL}/auth/refresh` : `/api/v1/auth/refresh`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data: ApiResponse<RefreshResponse> = await res.json();
  if (data.code !== 200 || !data.data) throw new Error('Refresh failed');

  useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
}

export async function uploadFile(file: File, bizType: 'punch' | 'reimbursement' | 'daily-report' | 'settlement'): Promise<UploadedFile> {
  if (IS_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const safeName = encodeURIComponent(file.name.replace(/\s+/g, '-'));
    return {
      id: `mock-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: `https://mock.local/uploads/${bizType}/${Date.now()}-${safeName}`,
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    };
  }

  const url = BASE_URL.startsWith('http') ? `${BASE_URL}/files` : '/api/v1/files';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bizType', bizType);

  const { accessToken } = useAuthStore.getState();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${newToken}` },
        body: formData,
      });
      if (!retryResponse.ok) {
        throw new RequestError(retryResponse.status, `鏂囦欢涓婁紶澶辫触: ${retryResponse.status}`);
      }
      const retryData: ApiResponse<UploadedFile> = await retryResponse.json();
      if (retryData.code !== 200) throw new RequestError(retryData.code, retryData.message);
      return retryData.data;
    } catch (err) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw err;
    }
  }

  if (!response.ok) {
    let errorMessage = `鏂囦欢涓婁紶澶辫触: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {}
    throw new RequestError(response.status, errorMessage);
  }

  const data: ApiResponse<UploadedFile> = await response.json();
  if (data.code !== 200) throw new RequestError(data.code, data.message);
  return data.data;
}

export async function uploadFiles(files: File[], bizType: 'punch' | 'reimbursement' | 'daily-report' | 'settlement'): Promise<UploadedFile[]> {
  return Promise.all(files.map(file => uploadFile(file, bizType)));
}

// --- Mock login accounts ---
const MOCK_ACCOUNTS: Record<string, { name: string; role: 'worker' | 'foreman' | 'boss' | 'admin' }> = {
  '13800000001': { name: '寮犱笁', role: 'worker' },
  '13800000002': { name: '李班长', role: 'foreman' },
  '13800000003': { name: '鐜嬭€佹澘', role: 'boss' },
  '13800000004': { name: '管理员', role: 'admin' },
};

let mockWorkerTodayStatus: any | null = null;
let mockWorkerMonthlyAttendance: Record<string, any> | null = null;
let mockForemanMonthlyAttendance: Record<string, any> | null = null;
let mockForemanTodayAttendanceByProject: Record<string, any> | null = null;
let mockForemanSiteStatus: any | null = null;
let mockReimbursementApprovals: any[] | null = null;
let mockReimbursementHistory: any | null = null;
let mockDailyReportTemplates: any[] | null = null;
let mockDailyReportHistory: any[] | null = null;
let mockForemanExceptions: any[] | null = null;
let mockContracts: any | null = null;
let mockIncomeSettlements: any[] | null = null;
let mockProjects: any[] | null = null;
let mockAdminWorkers: any[] | null = null;
let mockSettings: SystemSettings | null = null;

const MOCK_ADMIN_WORKERS_STORAGE_KEY = 'mock-admin-workers';
const MOCK_SETTINGS_STORAGE_KEY = 'mock-admin-settings';

const MOCK_FOREMAN_MONTHLY_STORAGE_KEY = 'mock-foreman-attendance-monthly';
const MOCK_FOREMAN_TODAY_STORAGE_KEY = 'mock-foreman-attendance-today';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getBody(options: RequestInit): any {
  if (!options.body || typeof options.body !== 'string') return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function loadMockData<T>(mockUrl: string): Promise<T> {
  const res = await fetch(mockUrl);
  if (!res.ok) throw new RequestError(res.status, `Mock 璇锋眰澶辫触: ${res.status}`);
  const json = await res.json();
  return clone(json.data);
}

function readMockStorage<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeMockStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function getMockReimbursementApprovals() {
  if (!mockReimbursementApprovals) {
    mockReimbursementApprovals = await loadMockData<any[]>('/mock/reimbursement-approvals.json');
  }
  return mockReimbursementApprovals;
}

async function getMockReimbursementHistory() {
  if (!mockReimbursementHistory) {
    mockReimbursementHistory = await loadMockData<any>('/mock/reimbursement-history.json');
  }
  return mockReimbursementHistory;
}

async function getMockDailyReportTemplates() {
  if (!mockDailyReportTemplates) {
    mockDailyReportTemplates = await loadMockData<any[]>('/mock/daily-report-templates.json');
  }
  return mockDailyReportTemplates;
}

function getMockTemplateOwner() {
  const user = useAuthStore.getState().user;
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
  };
}

function isVisibleMockTemplate(template: any, user: ReturnType<typeof useAuthStore.getState>['user']) {
  return template.visibility === 'system' || Number(template.owner?.id) === Number(user?.id);
}

function canManageMockTemplate(template: any, user: ReturnType<typeof useAuthStore.getState>['user']) {
  return template.visibility === 'personal' && Number(template.owner?.id) === Number(user?.id);
}

async function getMockDailyReportHistory() {
  if (!mockDailyReportHistory) {
    mockDailyReportHistory = await loadMockData<any[]>('/mock/daily-report-history.json');
  }
  return mockDailyReportHistory;
}

async function getMockForemanExceptions() {
  if (!mockForemanExceptions) {
    mockForemanExceptions = await loadMockData<any[]>('/mock/foreman-exceptions.json');
  }
  return mockForemanExceptions;
}

async function getMockContracts() {
  if (!mockContracts) {
    mockContracts = await loadMockData<any>('/mock/contracts.json');
  }
  return mockContracts;
}

async function getMockIncomeSettlements() {
  if (!mockIncomeSettlements) {
    mockIncomeSettlements = await loadMockData<any[]>('/mock/income-settlements.json');
  }
  return mockIncomeSettlements;
}

async function getMockProjects() {
  if (!mockProjects) {
    mockProjects = await loadMockData<any[]>('/mock/projects.json');
  }
  return mockProjects;
}

async function getMockAdminWorkers() {
  if (!mockAdminWorkers) {
    mockAdminWorkers =
      readMockStorage<any[]>(MOCK_ADMIN_WORKERS_STORAGE_KEY) ||
      await loadMockData<any[]>('/mock/foreman-workers.json');
  }
  return mockAdminWorkers;
}

function persistMockAdminWorkers() {
  if (mockAdminWorkers) {
    writeMockStorage(MOCK_ADMIN_WORKERS_STORAGE_KEY, mockAdminWorkers);
  }
}

function getMockSettings(): SystemSettings {
  if (!mockSettings) {
    mockSettings = readMockStorage<SystemSettings>(MOCK_SETTINGS_STORAGE_KEY) || { ...DEFAULT_SETTINGS };
  }
  return mockSettings;
}

function persistMockSettings() {
  if (mockSettings) {
    writeMockStorage(MOCK_SETTINGS_STORAGE_KEY, mockSettings);
  }
}

async function getMockWorkerMonthlyAttendance() {
  if (!mockWorkerMonthlyAttendance) {
    mockWorkerMonthlyAttendance = await loadMockData<Record<string, any>>('/mock/worker-attendance-monthly.json');
  }
  return mockWorkerMonthlyAttendance;
}

async function getMockForemanMonthlyAttendance() {
  if (!mockForemanMonthlyAttendance) {
    mockForemanMonthlyAttendance =
      readMockStorage<Record<string, any>>(MOCK_FOREMAN_MONTHLY_STORAGE_KEY) ||
      await loadMockData<Record<string, any>>('/mock/foreman-attendance-monthly.json');
  }
  return mockForemanMonthlyAttendance;
}

function persistMockForemanMonthlyAttendance() {
  if (mockForemanMonthlyAttendance) {
    writeMockStorage(MOCK_FOREMAN_MONTHLY_STORAGE_KEY, mockForemanMonthlyAttendance);
  }
}

function createDefaultMockForemanTodayAttendance(projectId: number) {
  return {
    projectId,
    date: todayDate(),
    workers: [],
  };
}

async function getMockForemanTodayAttendanceMap() {
  if (!mockForemanTodayAttendanceByProject) {
    mockForemanTodayAttendanceByProject =
      readMockStorage<Record<string, any>>(MOCK_FOREMAN_TODAY_STORAGE_KEY) ||
      await loadMockData<Record<string, any>>('/mock/foreman-attendance-today.json');
  }
  return mockForemanTodayAttendanceByProject;
}

function persistMockForemanTodayAttendanceMap() {
  if (mockForemanTodayAttendanceByProject) {
    writeMockStorage(MOCK_FOREMAN_TODAY_STORAGE_KEY, mockForemanTodayAttendanceByProject);
  }
}

async function getMockForemanTodayAttendance(projectId: number) {
  const todayByProject = await getMockForemanTodayAttendanceMap();
  const projectKey = String(projectId);

  if (!todayByProject[projectKey] || todayByProject[projectKey].date !== todayDate()) {
    todayByProject[projectKey] = createDefaultMockForemanTodayAttendance(projectId);
    persistMockForemanTodayAttendanceMap();
  }

  return todayByProject[projectKey];
}

async function getMockForemanSiteStatus() {
  if (!mockForemanSiteStatus) {
    mockForemanSiteStatus = await loadMockData<any>('/mock/foreman-site-status.json');
  }
  return mockForemanSiteStatus;
}

function getMockWorkerTodayStatus() {
  if (!mockWorkerTodayStatus) {
    const user = useAuthStore.getState().user;
    mockWorkerTodayStatus = {
      project: { id: 1, name: '绿地中心二期项目部' },
      worker: { id: user?.id || 1, name: user?.name || '寮犱笁', role: '鏈ㄥ伐' },
      inRange: true,
      distanceMeters: 5,
      nextPunchType: 'in',
      records: [],
    };
  }
  return mockWorkerTodayStatus;
}

function hasMockDailyReportToday(reports: Array<{ date?: string | null }> = []) {
  const todayKey = todayDate();
  return reports.some((report) => String(report.date || '').slice(0, 10) === todayKey);
}

function mockTodoTimestamp() {
  return new Date().toISOString();
}

async function buildMockTodos() {
  const user = useAuthStore.getState().user;
  const role = user?.role || 'worker';
  const todos: any[] = [];

  if (role === 'worker' || role === 'foreman') {
    const reports = await getMockDailyReportHistory();
    if (!hasMockDailyReportToday(reports)) {
      todos.push({
        id: `daily_report:${user?.id || 0}:${todayDate()}:1`,
        type: 'daily_report',
        title: "Submit today's daily report",
        description: 'Due by 18:00 today',
        priority: 'normal',
        status: 'pending',
        deadline: `${todayDate()}T18:00+08:00`,
        sourceId: 1,
        actionUrl: '/daily-report',
        createdAt: mockTodoTimestamp(),
      });
    }
  }

  if (role === 'worker') {
    const todayStatus = getMockWorkerTodayStatus();
    if (todayStatus.nextPunchType !== null) {
      todos.push({
        id: `attendance_reminder:worker:${todayDate()}`,
        type: 'attendance_reminder',
        title: 'Attendance reminder',
        description: todayStatus.nextPunchType === 'out'
          ? 'Remember to punch out before leaving today'
          : 'Punch in before starting work',
        priority: 'normal',
        status: 'pending',
        deadline: null,
        sourceId: todayStatus.worker?.id || 1,
        actionUrl: '/',
        createdAt: mockTodoTimestamp(),
      });
    }
  }

  if (role === 'foreman') {
    const siteStatus = await getMockForemanSiteStatus();
    const missing = Number(siteStatus?.missing || 0);
    if (missing > 0) {
      todos.push({
        id: `attendance_reminder:foreman:${todayDate()}`,
        type: 'attendance_reminder',
        title: 'Attendance reminder',
        description: `${missing} workers have not punched in`,
        priority: 'normal',
        status: 'pending',
        deadline: null,
        sourceId: 1,
        actionUrl: '/foreman-attendance',
        createdAt: mockTodoTimestamp(),
      });
    }
  }

  if (role === 'boss') {
    const approvals = await getMockReimbursementApprovals();
    approvals.forEach((item) => {
      todos.push({
        id: `reimbursement_approval:${item.id}`,
        type: 'reimbursement_approval',
        title: 'Review reimbursement request',
        description: `Amount: ${Number(item.amount || 0).toFixed(2)}`,
        priority: 'high',
        status: 'pending',
        deadline: null,
        sourceId: item.id,
        actionUrl: '/reimbursement',
        createdAt: mockTodoTimestamp(),
      });
    });
  }

  return todos;
}

async function syncMockWorkerMonthlyAttendance() {
  const status = getMockWorkerTodayStatus();
  const monthData = await getMockWorkerMonthlyAttendance();
  const dateKey = todayDate();
  const existing = monthData[dateKey] || {};
  const inRecord = status.records.find((record: any) => record.type === 'in');
  const outRecord = status.records.find((record: any) => record.type === 'out');
  const photoUrl = outRecord?.photoUrl || inRecord?.photoUrl || existing.pic || `https://picsum.photos/seed/wa-${dateKey}/200/200`;

  monthData[dateKey] = {
    ...existing,
    status: outRecord ? 'normal' : existing.status || 'normal',
    in: inRecord?.time || null,
    out: outRecord?.time || null,
    pic: photoUrl,
  };

  if (outRecord) {
    delete monthData[dateKey].reason;
  }
}

function assertNoBlobUrls(urls: string[] = []) {
  if (urls.some(url => url.startsWith('blob:'))) {
    throw new RequestError(422, '璇峰厛涓婁紶鍥剧墖鍚庡啀鎻愪氦');
  }
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();

  if (IS_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 600));
    logger.debug(`[MOCK API] ${method} ${endpoint}`, options.body ? JSON.parse(options.body as string) : '');

    // --- Auth mock endpoints (must come before non-GET early return) ---
    if (method === 'POST' && endpoint === '/api/v1/auth/login') {
      const body = JSON.parse(options.body as string);
      const account = MOCK_ACCOUNTS[body.phone];
      if (account && body.password === '123456') {
        return {
          code: 200,
          message: 'success',
          data: {
            accessToken: `mock-access-${account.role}-${Date.now()}`,
            refreshToken: `mock-refresh-${account.role}-${Date.now()}`,
            user: { id: Object.keys(MOCK_ACCOUNTS).indexOf(body.phone) + 1, phone: body.phone, name: account.name, role: account.role },
          },
        } as any;
      }
      throw new RequestError(401, '鎵嬫満鍙锋垨瀵嗙爜閿欒');
    }

    if (method === 'POST' && endpoint === '/api/v1/auth/refresh') {
      const body = JSON.parse(options.body as string);
      if (body.refreshToken?.startsWith('mock-refresh-')) {
        return {
          code: 200,
          message: 'success',
          data: {
            accessToken: `mock-access-renewed-${Date.now()}`,
            refreshToken: `mock-refresh-renewed-${Date.now()}`,
          },
        } as any;
      }
      throw new RequestError(401, 'Refresh token expired');
    }

    // --- Stateful mock endpoints ---
    if (method === 'GET' && endpoint.match(/\/api\/v1\/worker\/today-status/)) {
      return { code: 200, message: 'success', data: clone(getMockWorkerTodayStatus()) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/worker\/attendance\/monthly/)) {
      return { code: 200, message: 'success', data: clone(await getMockWorkerMonthlyAttendance()) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/foreman\/attendance\/monthly/)) {
      return { code: 200, message: 'success', data: clone(await getMockForemanMonthlyAttendance()) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/foreman\/attendance\/today/)) {
      const url = new URL(endpoint, 'http://mock.local');
      const projectId = Number(url.searchParams.get('projectId') || 1);
      return { code: 200, message: 'success', data: clone(await getMockForemanTodayAttendance(projectId)) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/worker\/punch/)) {
      const body = getBody(options);
      const status = getMockWorkerTodayStatus();
      const type = body.type;
      const latitude = body.latitude ?? body.lat;
      const longitude = body.longitude ?? body.lng;

      if (type !== 'in' && type !== 'out') throw new RequestError(400, '鎵撳崱绫诲瀷閿欒');
      if (typeof latitude !== 'number' || typeof longitude !== 'number') throw new RequestError(400, '鍧愭爣鏍煎紡閿欒');
      if (status.inRange === false) throw new RequestError(403, '瓒呭嚭鎵撳崱鑼冨洿');
      if (!status.nextPunchType) throw new RequestError(409, 'Today attendance already completed');
      if (status.nextPunchType !== type) {
        throw new RequestError(409, type === 'out' ? '璇峰厛瀹屾垚涓婄彮鎵撳崱' : '褰撳墠涓嶈兘閲嶅涓婄彮鎵撳崱');
      }

      const record = {
        id: Date.now(),
        type,
        time: nowTime(),
        status: 'present',
        projectId: status.project.id,
        photoUrl: body.photoUrl,
      };
      status.records.push(record);
      status.nextPunchType = type === 'in' ? 'out' : null;
      await syncMockWorkerMonthlyAttendance();
      return { code: 200, message: 'success', data: clone(record) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/reimbursements\/pending/)) {
      return { code: 200, message: 'success', data: clone(await getMockReimbursementApprovals()) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/reimbursements\/history/)) {
      return { code: 200, message: 'success', data: clone(await getMockReimbursementHistory()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/reimbursements$/)) {
      const body = getBody(options);
      assertNoBlobUrls(body.images);
      const user = useAuthStore.getState().user;
      const record = {
        id: Date.now(),
        applicant: user?.name || 'Applicant',
        applicantId: user?.id,
        date: todayDate(),
        type: body.type,
        amount: Number(body.amount),
        reason: body.reason,
        images: body.images || [],
        status: 'pending',
      };
      const history = await getMockReimbursementHistory();
      history.history = [record, ...history.history];
      history.summary.pendingAmount = Number(history.summary.pendingAmount || 0) + record.amount;

      const approvals = await getMockReimbursementApprovals();
      approvals.unshift({ ...record, role: user?.role || 'worker', status: 'pending' });
      return { code: 200, message: 'success', data: clone(record) } as any;
    }

    const approveMatch = endpoint.match(/\/api\/v1\/reimbursements\/(\d+)\/approve/);
    if (method === 'PUT' && approveMatch) {
      const id = Number(approveMatch[1]);
      const body = getBody(options);
      const approvals = await getMockReimbursementApprovals();
      const approval = approvals.find(item => Number(item.id) === id);
      if (!approval) throw new RequestError(404, 'Reimbursement not found');
      if (body.approved === false && !body.reason) throw new RequestError(422, 'Please provide a rejection reason');
      mockReimbursementApprovals = approvals.filter(item => Number(item.id) !== id);
      const updated = {
        ...approval,
        status: body.approved ? 'approved' : 'rejected',
        rejectReason: body.approved ? undefined : body.reason,
        approvedAt: new Date().toISOString(),
      };
      const history = await getMockReimbursementHistory();
      history.history = [updated, ...history.history.filter((item: any) => Number(item.id) !== id)];
      return { code: 200, message: 'success', data: clone(updated) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/reports\/templates/)) {
      const user = useAuthStore.getState().user;
      const templates = await getMockDailyReportTemplates();
      const visibleTemplates = templates.filter((item) => isVisibleMockTemplate(item, user));
      return { code: 200, message: 'success', data: clone(visibleTemplates) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/reports\/templates$/)) {
      const body = getBody(options);
      const owner = getMockTemplateOwner();
      if (!owner) throw new RequestError(401, '请先登录');
      const templates = await getMockDailyReportTemplates();
      const template = {
        id: Date.now(),
        name: body.name,
        content: body.content,
        visibility: 'personal',
        owner,
        editable: true,
        deletable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.unshift(template);
      return { code: 200, message: 'success', data: clone(template) } as any;
    }

    const templateMatch = endpoint.match(/\/api\/v1\/reports\/templates\/(\d+)/);
    if (method === 'PUT' && templateMatch) {
      const id = Number(templateMatch[1]);
      const body = getBody(options);
      const user = useAuthStore.getState().user;
      const templates = await getMockDailyReportTemplates();
      const index = templates.findIndex(item => Number(item.id) === id);
      if (index === -1) throw new RequestError(404, 'Template not found');
      if (!canManageMockTemplate(templates[index], user)) throw new RequestError(403, '无权限');
      templates[index] = {
        ...templates[index],
        name: body.name,
        content: body.content,
        updatedAt: new Date().toISOString(),
      };
      return { code: 200, message: 'success', data: clone(templates[index]) } as any;
    }

    if (method === 'DELETE' && templateMatch) {
      const id = Number(templateMatch[1]);
      const user = useAuthStore.getState().user;
      const templates = await getMockDailyReportTemplates();
      const index = templates.findIndex(item => Number(item.id) === id);
      if (index === -1) throw new RequestError(404, 'Template not found');
      if (!canManageMockTemplate(templates[index], user)) throw new RequestError(403, '无权限');
      templates.splice(index, 1);
      return { code: 200, message: 'success', data: { deleted: true, id } } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/reports\/history/)) {
      return { code: 200, message: 'success', data: clone(await getMockDailyReportHistory()) } as any;
    }

    const reportReviewMatch = endpoint.match(/\/api\/v1\/reports\/(\d+)\/review$/);
    if (method === 'PUT' && reportReviewMatch) {
      const id = Number(reportReviewMatch[1]);
      const reports = await getMockDailyReportHistory();
      const index = reports.findIndex(item => Number(item.id) === id);
      if (index === -1) throw new RequestError(404, 'Report not found');
      reports[index] = {
        ...reports[index],
        status: 'reviewed',
        boss: reports[index].boss || '王老板',
      };
      return { code: 200, message: 'success', data: clone(reports[index]) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/todos\/summary/)) {
      const todos = await buildMockTodos();
      const byType = todos.reduce<Record<string, number>>((acc, todo) => {
        acc[todo.type] = (acc[todo.type] || 0) + 1;
        return acc;
      }, {});

      return {
        code: 200,
        message: 'success',
        data: {
          total: todos.length,
          byType,
        },
      } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/todos/)) {
      return { code: 200, message: 'success', data: clone(await buildMockTodos()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/reports$/)) {
      const body = getBody(options);
      assertNoBlobUrls(body.images);
      const user = useAuthStore.getState().user;
      let matchedTemplate: any | null = null;
      if (body.templateId !== undefined && body.templateId !== null) {
        const templates = await getMockDailyReportTemplates();
        matchedTemplate =
          templates.find((item) => Number(item.id) === Number(body.templateId) && isVisibleMockTemplate(item, user)) ||
          null;
        if (!matchedTemplate) {
          throw new RequestError(403, '无权限使用该模板');
        }
      }
      const reports = await getMockDailyReportHistory();
      const report = {
        id: Date.now(),
        date: todayDate(),
        summary: `${String(body.content || '').slice(0, 24)}...`,
        status: 'submitted',
        boss: '王老板',
        images: body.images || [],
        templateId: matchedTemplate?.id,
        templateName: matchedTemplate?.name,
      };
      reports.unshift(report);
      return { code: 200, message: 'success', data: clone(report) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/foreman\/exceptions/)) {
      return { code: 200, message: 'success', data: clone(await getMockForemanExceptions()) } as any;
    }

    const processExceptionMatch = endpoint.match(/\/api\/v1\/foreman\/exceptions\/(\d+)\/process/);
    if (method === 'POST' && processExceptionMatch) {
      const id = Number(processExceptionMatch[1]);
      const exceptions = await getMockForemanExceptions();
      const item = exceptions.find(exception => Number(exception.id) === id);
      if (!item) throw new RequestError(404, 'Exception record not found');
      item.status = 'handled';
      return { code: 200, message: 'success', data: clone(item) } as any;
    }

    const rejectExceptionMatch = endpoint.match(/\/api\/v1\/foreman\/exceptions\/(\d+)\/reject/);
    if (method === 'POST' && rejectExceptionMatch) {
      const id = Number(rejectExceptionMatch[1]);
      const exceptions = await getMockForemanExceptions();
      const item = exceptions.find(exception => Number(exception.id) === id);
      if (!item) throw new RequestError(404, 'Exception record not found');
      item.status = 'rejected';
      return { code: 200, message: 'success', data: clone(item) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/foreman\/attendance/)) {
      const body = getBody(options);
      const projectId = Number(body.projectId || 1);
      const todayAttendance = await getMockForemanTodayAttendance(projectId);
      const todayWorkers = Array.isArray(todayAttendance.workers) ? todayAttendance.workers : [];
      const todayWorkerMap = new Map<number, any>(
        todayWorkers
          .filter((item: any) => typeof item?.workerId === 'number')
          .map((item: any) => [Number(item.workerId), item]),
      );

      (body.records || []).forEach((record: any) => {
        const workerId = Number(record.workerId);
        if (!Number.isFinite(workerId)) return;

        todayWorkerMap.set(workerId, {
          ...todayWorkerMap.get(workerId),
          workerId,
          dayShift: Number(record.dayShift ?? 0),
          overtimeHours: Number(record.overtimeHours ?? 0),
          status: 'recorded',
          in: todayWorkerMap.get(workerId)?.in ?? null,
          out: todayWorkerMap.get(workerId)?.out ?? null,
          updatedAt: new Date().toISOString(),
          reason: '班组已记工，暂无打卡记录',
        });
      });

      todayAttendance.projectId = projectId;
      todayAttendance.date = todayDate();
      todayAttendance.workers = Array.from(todayWorkerMap.values()).sort(
        (left: any, right: any) => Number(left.workerId) - Number(right.workerId),
      );
      persistMockForemanTodayAttendanceMap();

      const monthData = await getMockForemanMonthlyAttendance();
      const dateKey = todayDate();
      const existing = monthData[dateKey] || {};
      const existingIn = existing.in ?? existing.checkInTime ?? existing.punchInTime ?? null;
      const existingOut = existing.out ?? existing.checkOutTime ?? existing.punchOutTime ?? null;

      if (!existingIn && !existingOut) {
        monthData[dateKey] = {
          ...existing,
          status: 'recorded',
          in: null,
          out: null,
          pic: existing.pic ?? existing.photoUrl ?? null,
          reason: '班组已记工，暂无打卡记录',
        };
        persistMockForemanMonthlyAttendance();
      }

      return {
        code: 200,
        message: 'success',
        data: { submitted: true, projectId, recordCount: body.records?.length || 0 },
      } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/contracts$/)) {
      return { code: 200, message: 'success', data: clone(await getMockContracts()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/contracts$/)) {
      const body = getBody(options);
      const contracts = await getMockContracts();
      const type = body.type === 'expense' ? 'expense' : 'income';
      const prefix = type === 'income' ? 'INC' : 'EXP';
      const contract = {
        ...body.contract,
        id: body.contract?.id || `${prefix}-${Date.now()}`,
      };
      contracts[type].unshift(contract);
      return { code: 200, message: 'success', data: clone(contract) } as any;
    }

    const contractMatch = endpoint.match(/\/api\/v1\/contracts\/([^\/]+)/);
    if ((method === 'PUT' || method === 'DELETE') && contractMatch) {
      const id = decodeURIComponent(contractMatch[1]);
      const contracts = await getMockContracts();
      const type = contracts.income.some((item: any) => item.id === id) ? 'income' : 'expense';
      const index = contracts[type].findIndex((item: any) => item.id === id);
      if (index === -1) throw new RequestError(404, 'Contract not found');
      if (method === 'DELETE') {
        contracts[type].splice(index, 1);
        return { code: 200, message: 'success', data: { deleted: true, id } } as any;
      }
      const body = getBody(options);
      const targetType = body.type === 'expense' ? 'expense' : 'income';
      const updated = { ...contracts[type][index], ...body.contract, id };
      contracts[type].splice(index, 1);
      contracts[targetType].unshift(updated);
      return { code: 200, message: 'success', data: clone(updated) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/income-settlements$/)) {
      return { code: 200, message: 'success', data: clone(await getMockIncomeSettlements()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/income-settlements$/)) {
      const body = getBody(options);
      const settlements = await getMockIncomeSettlements();
      const item = { ...body, id: body.id || `INC-SET-${Date.now()}` };
      settlements.unshift(item);
      return { code: 200, message: 'success', data: clone(item) } as any;
    }

    const settlementMatch = endpoint.match(/\/api\/v1\/income-settlements\/([^\/]+)/);
    if ((method === 'PUT' || method === 'DELETE') && settlementMatch) {
      const id = decodeURIComponent(settlementMatch[1]);
      const settlements = await getMockIncomeSettlements();
      const index = settlements.findIndex(item => item.id === id);
      if (index === -1) throw new RequestError(404, 'Settlement not found');
      if (method === 'DELETE') {
        settlements.splice(index, 1);
        return { code: 200, message: 'success', data: { deleted: true, id } } as any;
      }
      const updated = { ...settlements[index], ...getBody(options), id };
      settlements[index] = updated;
      return { code: 200, message: 'success', data: clone(updated) } as any;
    }

    if (method === 'GET' && endpoint.match(/\/api\/v1\/projects$/)) {
      return { code: 200, message: 'success', data: clone(await getMockProjects()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/projects$/)) {
      const body = getBody(options);
      const projects = await getMockProjects();
      const nextId = projects.reduce((max, project) => {
        const numeric = typeof project.id === 'number' ? project.id : Number(String(project.id).replace(/\D/g, ''));
        return Math.max(max, Number.isFinite(numeric) ? numeric : 0);
      }, 0) + 1;
      const project = { ...body, id: nextId };
      projects.unshift(project);
      return { code: 200, message: 'success', data: clone(project) } as any;
    }

    const projectMatch = endpoint.match(/\/api\/v1\/projects\/([^\/]+)$/);
    if ((method === 'PUT' || method === 'DELETE') && projectMatch) {
      const id = decodeURIComponent(projectMatch[1]);
      const projects = await getMockProjects();
      const index = projects.findIndex(project => String(project.id) === id);
      if (index === -1) throw new RequestError(404, 'Project not found');
      if (method === 'DELETE') {
        projects.splice(index, 1);
        return { code: 200, message: 'success', data: { deleted: true, id } } as any;
      }
      const updated = { ...projects[index], ...getBody(options), id: projects[index].id };
      projects[index] = updated;
      return { code: 200, message: 'success', data: clone(updated) } as any;
    }

    // --- Admin Settings ---
    if (method === 'GET' && endpoint === '/api/v1/admin/settings') {
      return { code: 200, message: 'success', data: clone(getMockSettings()) } as any;
    }

    if (method === 'PUT' && endpoint === '/api/v1/admin/settings') {
      const body = getBody(options);
      const current = getMockSettings();
      mockSettings = { ...current, ...body, notifications: { ...current.notifications, ...(body.notifications || {}) } };
      persistMockSettings();
      return { code: 200, message: 'success', data: clone(mockSettings) } as any;
    }

    // --- Admin Workers CRUD ---
    if (method === 'GET' && endpoint.match(/\/api\/v1\/admin\/workers$/)) {
      return { code: 200, message: 'success', data: clone(await getMockAdminWorkers()) } as any;
    }

    if (method === 'POST' && endpoint.match(/\/api\/v1\/admin\/workers$/)) {
      const body = getBody(options);
      if (!body.name) throw new RequestError(400, '员工姓名不能为空');
      const workers = await getMockAdminWorkers();
      const nextId = workers.reduce((max, w) => Math.max(max, typeof w.id === 'number' ? w.id : 0), 0) + 1;
      const worker = {
        id: nextId,
        name: body.name,
        role: body.role || '普工',
        avatar: body.avatar || body.name[0],
        phone: body.phone || '',
        team: body.team || '',
        dailyWage: Number(body.dailyWage) || 0,
        status: body.status || 'active',
      };
      workers.unshift(worker);
      persistMockAdminWorkers();
      return { code: 200, message: 'success', data: clone(worker) } as any;
    }

    const adminWorkerMatch = endpoint.match(/\/api\/v1\/admin\/workers\/(\d+)$/);
    if (method === 'PUT' && adminWorkerMatch) {
      const id = Number(adminWorkerMatch[1]);
      const body = getBody(options);
      const workers = await getMockAdminWorkers();
      const index = workers.findIndex(w => w.id === id);
      if (index === -1) throw new RequestError(404, '员工不存在');
      workers[index] = { ...workers[index], ...body, id };
      persistMockAdminWorkers();
      return { code: 200, message: 'success', data: clone(workers[index]) } as any;
    }

    if (method === 'DELETE' && adminWorkerMatch) {
      const id = Number(adminWorkerMatch[1]);
      const workers = await getMockAdminWorkers();
      const index = workers.findIndex(w => w.id === id);
      if (index === -1) throw new RequestError(404, '员工不存在');
      workers.splice(index, 1);
      persistMockAdminWorkers();
      return { code: 200, message: 'success', data: { deleted: true, id } } as any;
    }

    // --- Non-GET: simulate success ---
    if (method !== 'GET') {
      return { code: 200, message: 'success', data: null as any };
    }

    // --- GET: map to mock JSON files ---

    function parseQueryParams(url: string): Record<string, string> {
      const qIdx = url.indexOf('?');
      if (qIdx === -1) return {};
      const params = new URLSearchParams(url.slice(qIdx + 1));
      const result: Record<string, string> = {};
      params.forEach((value, key) => { result[key] = value; });
      return result;
    }
    let mockUrl = '';
    if (endpoint.match(/\/api\/v1\/attendance\/summary/)) {
      mockUrl = '/mock/attendance.json';
    } else if (endpoint.match(/\/api\/v1\/projects\/[^\/]+\/attendance/)) {
      mockUrl = '/mock/project-detail.json';
    } else if (endpoint.match(/\/api\/v1\/workers\/[^\/]+\/attendance/)) {
      mockUrl = '/mock/person-records.json';
    } else if (endpoint.match(/\/api\/v1\/employees\/[^\/]+\/attendance/)) {
      mockUrl = '/mock/employee-records.json';
    } else if (endpoint.match(/\/api\/v1\/reimbursements\/pending/)) {
      mockUrl = '/mock/reimbursement-approvals.json';
    } else if (endpoint.match(/\/api\/v1\/reimbursements\/history/)) {
      mockUrl = '/mock/reimbursement-history.json';
    } else if (endpoint.match(/\/api\/v1\/reports\/templates/)) {
      mockUrl = '/mock/daily-report-templates.json';
    } else if (endpoint.match(/\/api\/v1\/reports\/history/)) {
      mockUrl = '/mock/daily-report-history.json';
    } else if (endpoint.match(/\/api\/v1\/dashboard\/boss/)) {
      mockUrl = '/mock/boss-home.json';
    } else if (endpoint.match(/\/api\/v1\/contracts/)) {
      mockUrl = '/mock/contracts.json';
    } else if (endpoint.match(/\/api\/v1\/income-settlements/)) {
      mockUrl = '/mock/income-settlements.json';
    } else if (endpoint.match(/\/api\/v1\/boss\/project-attendance-detail/)) {
      // Parameterized: generate project-specific data based on ?name=
      const qp = parseQueryParams(endpoint);
      const projName = qp.name ? decodeURIComponent(qp.name) : '';
      const attRes = await fetch('/mock/attendance.json');
      if (attRes.ok) {
        const attData = (await attRes.json()).data;
        const proj = attData.projects?.find((p: any) => p.name === projName);
        if (proj) {
          const seed = proj.id * 7;
          const total = proj.total || 100;
          const present = proj.present || Math.round(total * 0.92);
          const absent = total - present;
          const overtime = proj.overtime || Math.round(total * 0.15);
          const workerNames = ['寮犱笁','鏉庡洓','鐜嬩簲','璧靛叚','闄堜竷','鍛ㄥ叓','鍚翠節','閮戝崄','瀛欎竴','閽变簩'];
          const roles = ['鏈ㄥ伐鐝粍','姘寸數鐝粍','娉ョ摝鐝粍','閽㈢瓔鐝粍'];
          const workers = Array.from({ length: Math.min(total, 10) }, (_, i) => ({
            id: i + 1,
            name: workerNames[(seed + i) % workerNames.length],
            role: roles[(seed + i) % roles.length],
            presentDays: 18 + ((seed + i * 3) % 5),
            overtimeHours: ((seed + i * 2) % 16),
          }));
          const dailyRecords = attData.dailyTrend?.map((d: any, i: number) => ({
            id: i + 1, date: d.date,
            present: Math.round(present * (0.93 + ((seed + i) % 8) / 100)),
            absent: Math.round(absent * (0.5 + ((seed + i) % 5) / 10)),
            overtime: Math.round(overtime * (0.6 + ((seed + i * 3) % 6) / 10)),
          })) || [];
          return { code: 200, message: 'success', data: { summary: { total, present, absent, overtime, attendanceRate: Math.round(present / total * 1000) / 10 }, workers, dailyRecords } } as any;
        }
      }
      mockUrl = '/mock/boss-project-attendance-detail.json';
    } else if (endpoint.match(/\/api\/v1\/boss\/project-cost/)) {
      mockUrl = '/mock/boss-project-cost.json';
    } else if (endpoint.match(/\/api\/v1\/boss\/employee-detail/)) {
      // Parameterized: generate employee-specific data based on ?id=
      const qp = parseQueryParams(endpoint);
      const empId = parseInt(qp.id || '1', 10);
      const workers = await getMockAdminWorkers();
      const emp = workers.find((w: any) => w.id === empId);
      if (emp) {
        const seed = empId * 13;
        const projects = ['绿地中心二期项目部', '万达广场三期', '高新区科技园', '地铁6号线标段'];
        const statusOptions = ['present', 'present', 'present', 'present', 'absent', 'present', 'present'];
        const timeBase = ['07:45', '07:46', '07:47', '07:48', '07:49', '07:50', '07:51', '07:52', '07:53', '07:54', '07:55'];
        const otOptions = [0, 0, 1, 1.5, 2, 0, 0, 2.5, 3, 0, 1, 0];
        const records: any[] = [];
        let recId = 1;
        const dates = [
          '2026-04-01','2026-04-02','2026-04-03','2026-04-06','2026-04-07','2026-04-08','2026-04-09','2026-04-10',
          '2026-04-13','2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-20','2026-04-21','2026-04-22',
          '2026-04-23','2026-04-24','2026-04-27','2026-04-28','2026-04-29','2026-04-30',
          '2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-09','2026-03-10','2026-03-11',
          '2026-03-12','2026-03-13','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20',
          '2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-30','2026-03-31',
        ];
        for (const date of dates) {
          const idx = (seed + recId) % statusOptions.length;
          const status = statusOptions[idx];
          records.push({
            id: recId, date, status,
            time: status === 'present' ? timeBase[(seed + recId) % timeBase.length] : null,
            overtime: status === 'present' ? otOptions[(seed + recId) % otOptions.length] : 0,
          });
          recId++;
        }
        const presentDays = records.filter(r => r.status === 'present').length;
        const absentDays = records.length - presentDays;
        const overtimeHours = records.reduce((s, r) => s + r.overtime, 0);
        return {
          code: 200, message: 'success',
          data: {
            employeeId: emp.id, employeeName: emp.name, team: emp.team || '未分配', project: projects[seed % projects.length],
            summary: { totalDays: records.length, presentDays, absentDays, overtimeHours, attendanceRate: Math.round(presentDays / records.length * 1000) / 10 },
            records,
          },
        } as any;
      }
      throw new RequestError(404, '员工不存在');
    } else if (endpoint.match(/\/api\/v1\/boss\/employees/)) {
      const workers = await getMockAdminWorkers();
      const projects = ['绿地中心二期项目部', '万达广场三期', '高新区科技园', '地铁6号线标段'];
      const data = workers.map((w: any) => {
        const seed = (typeof w.id === 'number' ? w.id : 0) * 7;
        const isPresent = seed % 7 !== 3;
        return {
          id: w.id,
          name: w.name,
          team: w.team || '未分配',
          project: projects[seed % projects.length],
          status: isPresent ? 'present' : 'absent',
          time: isPresent ? `07:${50 + (seed % 10)}` : null,
          overtime: isPresent ? (seed % 4) * 0.5 : 0,
          ...(isPresent ? {} : { reason: '请假' }),
          dailyWage: w.dailyWage,
          role: w.role,
          phone: w.phone,
        };
      });
      return { code: 200, message: 'success', data: clone(data) } as any;
    } else if (endpoint.match(/\/api\/v1\/worker\/attendance\/monthly/)) {
      mockUrl = '/mock/worker-attendance-monthly.json';
    } else if (endpoint.match(/\/api\/v1\/worker\/stats/)) {
      mockUrl = '/mock/worker-stats.json';
    } else if (endpoint.match(/\/api\/v1\/projects/)) {
      mockUrl = '/mock/projects.json';
    } else if (endpoint.match(/\/api\/v1\/reimbursement\/overview/)) {
      mockUrl = '/mock/reimbursement-overview.json';
    } else if (endpoint.match(/\/api\/v1\/reimbursement\/project-detail/)) {
      mockUrl = '/mock/project-reimbursement-detail.json';
    } else if (endpoint.match(/\/api\/v1\/foreman\/projects/)) {
      mockUrl = '/mock/foreman-projects.json';
    } else if (endpoint.match(/\/api\/v1\/foreman\/workers/)) {
      return { code: 200, message: 'success', data: clone(await getMockAdminWorkers()) } as any;
    } else if (endpoint.match(/\/api\/v1\/foreman\/site-status/)) {
      mockUrl = '/mock/foreman-site-status.json';
    } else if (endpoint.match(/\/api\/v1\/foreman\/exceptions/)) {
      mockUrl = '/mock/foreman-exceptions.json';
    }

    if (mockUrl) {
      const res = await fetch(mockUrl);
      if (!res.ok) throw new RequestError(res.status, `Mock 璇锋眰澶辫触: ${res.status}`);
      return await res.json();
    }

    throw new RequestError(404, `鏈壘鍒癕ock璺敱: ${endpoint}`);
  }

  // --- Real API Request ---
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.replace('/api/v1', '')}`;

  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // Try to read error body for better error messages
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {}

    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const originalBody = options.body;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          processQueue(null, newToken);
          const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`,
          };
          const retryRes = await fetch(url, { ...options, headers: retryHeaders, body: originalBody });
          if (!retryRes.ok) {
            let retryErrorMsg = `HTTP Error: ${retryRes.status}`;
            try { const d = await retryRes.json(); if (d.message) retryErrorMsg = d.message; } catch {}
            throw new RequestError(retryRes.status, retryErrorMsg);
          }
          return await retryRes.json();
        } catch (refreshError) {
          processQueue(refreshError);
          useAuthStore.getState().logout();
          window.location.href = '/login';
          throw new RequestError(401, 'Login expired, please sign in again');
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            const retryHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
            fetch(url, { ...options, headers: retryHeaders, body: originalBody })
              .then(res => res.json())
              .then(resolve)
              .catch(reject);
          },
          reject,
        });
      });
    }
    throw new RequestError(response.status, errorMessage);
  }

  const data: ApiResponse<T> = await response.json();

  if (data.code !== 200) {
    logger.error(`Business Error: ${data.message}`);
    throw new RequestError(data.code, data.message);
  }

  return data;
}
