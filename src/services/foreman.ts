import { request } from '@/lib/api';
import { extractList } from '@/lib/utils';
import {
  AttendanceSubmitPayload,
  Exception,
  ForemanTodayAttendance,
  ProcessExceptionPayload,
  Project,
  RejectExceptionPayload,
  SiteStatus,
  Worker,
} from '@/types/models';

export const foremanApi = {
  getProjects: async () => {
    const res = await request<Project[]>('/api/v1/foreman/projects');
    return { ...res, data: extractList(res.data) };
  },
  getWorkers: async (projectId?: number) => {
    const res = await request<Worker[]>(`/api/v1/foreman/workers${projectId ? `?projectId=${projectId}` : ''}`);
    return { ...res, data: extractList(res.data) };
  },
  getTodayAttendance: (projectId: number) => request<ForemanTodayAttendance>(`/api/v1/foreman/attendance/today?projectId=${projectId}`),
  submitAttendance: (data: AttendanceSubmitPayload) =>
    request<void>('/api/v1/foreman/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSiteStatus: () => request<SiteStatus>('/api/v1/foreman/site-status'),
  getExceptions: async () => {
    const res = await request<Exception[]>('/api/v1/foreman/exceptions');
    return { ...res, data: extractList(res.data) };
  },
  processException: (id: number, payload: ProcessExceptionPayload) =>
    request<void>(`/api/v1/foreman/exceptions/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rejectException: (id: number, payload: RejectExceptionPayload) =>
    request<void>(`/api/v1/foreman/exceptions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
