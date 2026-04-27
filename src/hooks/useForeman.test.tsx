import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForemanWorkbench } from './useForeman';

const foremanApiMock = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getWorkers: vi.fn(),
  getTodayAttendance: vi.fn(),
  submitAttendance: vi.fn(),
  getSiteStatus: vi.fn(),
  getExceptions: vi.fn(),
  processException: vi.fn(),
  rejectException: vi.fn(),
}));

vi.mock('@/services/foreman', () => ({
  foremanApi: foremanApiMock,
}));

describe('useForemanWorkbench', () => {
  beforeEach(() => {
    foremanApiMock.getProjects.mockReset();
    foremanApiMock.getWorkers.mockReset();
    foremanApiMock.getTodayAttendance.mockReset();
    foremanApiMock.submitAttendance.mockReset();

    foremanApiMock.getProjects.mockResolvedValue({
      code: 200,
      message: 'success',
      data: [
        { id: 1, name: '\u7eff\u5730\u4e2d\u5fc3\u4e8c\u671f\u9879\u76ee\u90e8', team: '\u6728\u5de5\u73ed\u7ec4', count: 8 },
      ],
    });
    foremanApiMock.getWorkers.mockResolvedValue({
      code: 200,
      message: 'success',
      data: [
        { id: 1, name: '\u5f20\u4e09', role: '\u6728\u5de5', avatar: '\u5f20' },
      ],
    });
    foremanApiMock.getTodayAttendance.mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        projectId: 1,
        date: '2026-04-23',
        workers: [
          {
            workerId: 1,
            dayShift: 1,
            overtimeHours: 0,
            status: 'recorded',
            in: null,
            out: null,
            updatedAt: '2026-04-23T09:18:00+08:00',
          },
        ],
      },
    });
  });

  it('loads today attendance records for a selected project', async () => {
    const { result } = renderHook(() => useForemanWorkbench());

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1);
    });

    await act(async () => {
      await result.current.fetchProjectData(1);
    });

    expect(foremanApiMock.getWorkers).toHaveBeenCalledWith(1);
    expect(foremanApiMock.getTodayAttendance).toHaveBeenCalledWith(1);
    expect(result.current.submittedRecords).toMatchObject({
      1: {
        dayShift: 1,
        overtime: 0,
        status: 'recorded',
      },
    });
  });

  it('refetches today attendance after a successful submit', async () => {
    const nextTodayResponse = {
      code: 200,
      message: 'success',
      data: {
        projectId: 1,
        date: '2026-04-23',
        workers: [
          {
            workerId: 1,
            dayShift: 1,
            overtimeHours: 1.5,
            status: 'recorded',
            in: null,
            out: null,
            updatedAt: '2026-04-23T10:00:00+08:00',
          },
        ],
      },
    };

    foremanApiMock.getTodayAttendance
      .mockResolvedValueOnce({
        code: 200,
        message: 'success',
        data: { projectId: 1, date: '2026-04-23', workers: [] },
      })
      .mockResolvedValueOnce(nextTodayResponse);

    const { result } = renderHook(() => useForemanWorkbench());

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1);
    });

    await act(async () => {
      await result.current.fetchProjectData(1);
    });

    expect(result.current.submittedRecords).toEqual({});

    await act(async () => {
      await result.current.submitAttendance({
        projectId: 1,
        records: [
          {
            workerId: 1,
            dayShift: 1,
            overtimeHours: 1.5,
          },
        ],
      });
    });

    expect(foremanApiMock.submitAttendance).toHaveBeenCalledWith({
      projectId: 1,
      records: [
        {
          workerId: 1,
          dayShift: 1,
          overtimeHours: 1.5,
        },
      ],
    });
    expect(foremanApiMock.getTodayAttendance).toHaveBeenCalledTimes(2);
    expect(result.current.submittedRecords).toMatchObject({
      1: {
        dayShift: 1,
        overtime: 1.5,
        status: 'recorded',
      },
    });
  });

  it('keeps workers loaded when today attendance refill fails', async () => {
    foremanApiMock.getTodayAttendance.mockRejectedValueOnce(new Error('today attendance failed'));

    const { result } = renderHook(() => useForemanWorkbench());

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1);
    });

    await act(async () => {
      await result.current.fetchProjectData(1);
    });

    expect(result.current.workers).toHaveLength(1);
    expect(result.current.submittedRecords).toEqual({});
  });
});
