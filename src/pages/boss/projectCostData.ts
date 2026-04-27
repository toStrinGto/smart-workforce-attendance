import { Worker } from '@/types/models';

export interface AttendanceRecord {
  workerId: number;
  date: string;
  dayShift: number;
  overtimeHours: number;
}

export interface ReimbursementRecord {
  id: number;
  amount: number;
  description: string;
  date: string;
}

export interface ProjectCostPayload {
  attendance?: AttendanceRecord[] | null;
  reimbursements?: ReimbursementRecord[] | null;
  workers?: Worker[] | null;
}

export interface NormalizedProjectCostData {
  attendance: AttendanceRecord[];
  reimbursements: ReimbursementRecord[];
  workers: Worker[];
}

function isProjectCostPayload(value: unknown): value is ProjectCostPayload {
  return Boolean(value) && typeof value === 'object' && (
    'attendance' in (value as Record<string, unknown>) ||
    'reimbursements' in (value as Record<string, unknown>) ||
    'workers' in (value as Record<string, unknown>)
  );
}

export function normalizeProjectCostResponse(data: unknown, projectId: number | null): NormalizedProjectCostData {
  if (isProjectCostPayload(data)) {
    return {
      attendance: data.attendance || [],
      reimbursements: data.reimbursements || [],
      workers: data.workers || [],
    };
  }

  if (projectId != null && data && typeof data === 'object') {
    const keyed = (data as Record<string, unknown>)[String(projectId)];
    if (isProjectCostPayload(keyed)) {
      return {
        attendance: keyed.attendance || [],
        reimbursements: keyed.reimbursements || [],
        workers: keyed.workers || [],
      };
    }
  }

  return {
    attendance: [],
    reimbursements: [],
    workers: [],
  };
}
