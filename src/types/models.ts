export interface Worker {
  id: number;
  name: string;
  role: string;
  avatar: string;
  dailyWage?: number;
  phone?: string;
  team?: string;
  status?: 'active' | 'inactive';
}

export interface Project {
  id: number;
  name: string;
  team: string;
  count: number;
}

export interface Photo {
  id: number;
  name: string;
  time: string;
  pic: string;
}

export interface SiteStatus {
  projectName: string;
  totalWorkers: number;
  checkedIn: number;
  missing: number;
  photos: Photo[];
}

export interface Exception {
  id: number;
  name: string;
  date: string;
  reason: string;
  status: 'pending' | 'handled' | 'rejected';
}

export interface ProcessExceptionPayload {
  dayShift: number;
  overtimeHours: number;
  notes: string;
}

export interface RejectExceptionPayload {
  reason: string;
}

export interface AttendanceRecord {
  workerId: number;
  dayShift: number;
  overtimeHours: number;
}

export interface AttendanceSubmitPayload {
  projectId: number;
  records: AttendanceRecord[];
}

export interface ForemanTodayAttendanceWorker {
  workerId: number;
  dayShift: number;
  overtimeHours: number;
  status?: string | null;
  in?: string | null;
  out?: string | null;
  updatedAt?: string | null;
  reason?: string | null;
}

export interface ForemanTodayAttendance {
  projectId: number;
  date: string;
  workers: ForemanTodayAttendanceWorker[];
}

export interface ForemanSubmittedRecord {
  dayShift: number;
  overtime: number;
  status?: string | null;
  in?: string | null;
  out?: string | null;
  updatedAt?: string | null;
  reason?: string | null;
}

export interface AdminProject {
  id: number;
  name: string;
  manager: string;
  startDate: string;
  status: '未开工' | '施工中' | '维保中' | '已完工';
  budget: number;
}

export interface BossEmployee {
  id: number;
  name: string;
  team: string;
  project: string;
  status: 'present' | 'absent';
  time: string | null;
  overtime: number;
  reason?: string;
}

export interface SystemSettings {
  clockIn: string;
  clockOut: string;
  lateGrace: number;
  overtimeStart: number;
  hourMode: 'standard' | 'flexible';
  budgetUnit: string;
  defaultStatus: string;
  progressAlert: number;
  projectPrefix: string;
  notifications: {
    exception: boolean;
    weekly: boolean;
    delay: boolean;
    daily: boolean;
  };
}

export const DEFAULT_SETTINGS: SystemSettings = {
  clockIn: '08:00',
  clockOut: '18:00',
  lateGrace: 15,
  overtimeStart: 1,
  hourMode: 'standard',
  budgetUnit: '万元',
  defaultStatus: '未开工',
  progressAlert: 30,
  projectPrefix: 'P',
  notifications: {
    exception: true,
    weekly: true,
    delay: true,
    daily: false,
  },
};

export interface AdminAttendanceRecord {
  id: number;
  date: string;
  status: string;
  overtime: number;
  time: string | null;
  notes?: string;
}
