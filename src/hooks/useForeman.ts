import { useCallback, useEffect, useState } from 'react';
import { foremanApi } from '@/services/foreman';
import {
  AttendanceSubmitPayload,
  Exception,
  ForemanSubmittedRecord,
  ForemanTodayAttendance,
  Project,
  SiteStatus,
  Worker,
} from '@/types/models';
import { logger } from '@/lib/logger';

function mapTodayAttendanceToSubmittedRecords(
  todayAttendance: ForemanTodayAttendance | null | undefined,
): Record<number, ForemanSubmittedRecord> {
  const workers = Array.isArray(todayAttendance?.workers) ? todayAttendance.workers : [];

  return workers.reduce<Record<number, ForemanSubmittedRecord>>((acc, record) => {
    if (typeof record.workerId !== 'number') return acc;

    acc[record.workerId] = {
      dayShift: Number(record.dayShift ?? 0),
      overtime: Number(record.overtimeHours ?? 0),
      status: record.status ?? null,
      in: record.in ?? null,
      out: record.out ?? null,
      updatedAt: record.updatedAt ?? null,
      reason: record.reason ?? null,
    };

    return acc;
  }, {});
}

export function useForemanWorkbench() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [submittedRecords, setSubmittedRecords] = useState<Record<number, ForemanSubmittedRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsRes = await foremanApi.getProjects();
      setProjects(projectsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchProjectData = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const workersRes = await foremanApi.getWorkers(projectId);
      setWorkers(workersRes.data);

      try {
        const todayAttendanceRes = await foremanApi.getTodayAttendance(projectId);
        setSubmittedRecords(mapTodayAttendanceToSubmittedRecords(todayAttendanceRes.data));
      } catch (err: any) {
        logger.error('Failed to fetch foreman today attendance', err);
        setSubmittedRecords({});
        setError(err.message || 'Failed to fetch today attendance');
      }
    } catch (err: any) {
      logger.error('Failed to fetch project data for foreman workbench', err);
      setError(err.message || 'Failed to fetch project data');
      setWorkers([]);
      setSubmittedRecords({});
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAttendance = useCallback(async (payload: AttendanceSubmitPayload) => {
    await foremanApi.submitAttendance(payload);

    try {
      const todayAttendanceRes = await foremanApi.getTodayAttendance(payload.projectId);
      setSubmittedRecords(mapTodayAttendanceToSubmittedRecords(todayAttendanceRes.data));
      setError(null);
    } catch (err: any) {
      logger.error('Failed to refresh foreman today attendance after submit', err);
      setError(err.message || 'Failed to refresh today attendance');
    }
  }, []);

  return {
    projects,
    workers,
    submittedRecords,
    loading,
    error,
    submitAttendance,
    fetchProjectData,
    refetch: fetchData,
  };
}

export function useForemanSite() {
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await foremanApi.getSiteStatus();
      setStatus(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch site status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

export function useForemanExceptions() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await foremanApi.getExceptions();
      setExceptions(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exceptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const processException = async (id: number, payload: { dayShift: number; overtimeHours: number; notes: string }) => {
    await foremanApi.processException(id, payload);
    setExceptions((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'handled' } : item)));
  };

  const rejectException = async (id: number, payload: { reason: string }) => {
    await foremanApi.rejectException(id, payload);
    setExceptions((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item)));
  };

  return { exceptions, loading, error, processException, rejectException, refetch: fetchExceptions };
}
