import { request } from '@/lib/api';

export type PunchType = 'in' | 'out';

export interface WorkerPunchRecord {
  id?: number;
  type: PunchType;
  time: string;
  status: string;
  photoUrl?: string;
}

export interface WorkerTodayStatus {
  project: {
    id: number;
    name: string;
  };
  worker: {
    id: number;
    name: string;
    role: string;
  };
  inRange: boolean;
  distanceMeters?: number;
  nextPunchType: PunchType | null;
  records: WorkerPunchRecord[];
}

export interface PunchPayload {
  type: PunchType;
  latitude: number;
  longitude: number;
  photoUrl?: string;
}

interface BackendTodayStatus {
  clockedIn?: boolean;
  clockedOut?: boolean;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  // Some fields may be present in mock or future backend versions
  project?: { id: number; name: string };
  worker?: { id: number; name: string; role: string };
  inRange?: boolean;
  distanceMeters?: number;
  nextPunchType?: PunchType | null;
  records?: WorkerPunchRecord[];
}

function normalizeTodayStatus(raw: BackendTodayStatus): WorkerTodayStatus {
  // If backend already provides nextPunchType, use it directly
  if (raw.nextPunchType !== undefined && raw.records !== undefined) {
    return raw as unknown as WorkerTodayStatus;
  }

  // Derive nextPunchType from clockedIn/clockedOut
  let nextPunchType: PunchType | null;
  if (raw.clockedIn && raw.clockedOut) {
    nextPunchType = null;
  } else if (raw.clockedIn && !raw.clockedOut) {
    nextPunchType = 'out';
  } else {
    nextPunchType = 'in';
  }

  const records: WorkerPunchRecord[] = [];
  if (raw.clockInTime) {
    records.push({ type: 'in', time: raw.clockInTime, status: 'normal' });
  }
  if (raw.clockOutTime) {
    records.push({ type: 'out', time: raw.clockOutTime, status: 'normal' });
  }

  return {
    project: raw.project ?? { id: 0, name: '暂无项目' },
    worker: raw.worker ?? { id: 0, name: '工人', role: 'worker' },
    inRange: raw.inRange ?? true,
    distanceMeters: raw.distanceMeters,
    nextPunchType,
    records,
  };
}

export const workerApi = {
  getTodayStatus: async () => {
    const res = await request<BackendTodayStatus>('/api/v1/worker/today-status');
    return { ...res, data: normalizeTodayStatus(res.data) };
  },
  punch: (payload: PunchPayload) =>
    request<WorkerPunchRecord>('/api/v1/worker/punch', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
