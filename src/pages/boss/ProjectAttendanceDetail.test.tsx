import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BossProjectAttendanceDetail from './ProjectAttendanceDetail';

const requestMock = vi.fn();

vi.mock('@/lib/api', () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/project-attendance/demo-project']}>
      <Routes>
        <Route path="/project-attendance/:name" element={<BossProjectAttendanceDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BossProjectAttendanceDetail', () => {
  beforeEach(() => {
    requestMock.mockReset();

    requestMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/v1/boss/project-attendance-detail?name=demo-project') {
        return {
          code: 200,
          message: 'success',
          data: {
            workers: [
              { id: 1, name: 'Zhang San', role: 'Carpenter', presentDays: 8, overtimeHours: 3 },
              { id: 2, name: 'Li Si', role: 'Steel Worker', presentDays: 4, overtimeHours: 0 },
            ],
            dailyRecords: [
              { id: 1, date: '2026-03-30', present: 5, absent: 1, overtime: 0 },
              { id: 2, date: '2026-04-01', present: 6, absent: 0, overtime: 0 },
              { id: 3, date: '2026-04-10', present: 5, absent: 1, overtime: 2 },
              { id: 4, date: '2026-04-20', present: 6, absent: 0, overtime: 1 },
              { id: 5, date: '2026-04-21', present: 7, absent: 0, overtime: 1 },
            ],
          },
        };
      }

      if (endpoint === '/api/v1/boss/employee-detail?id=1') {
        return {
          code: 200,
          message: 'success',
          data: {
            employeeId: 1,
            employeeName: 'Zhang San',
            team: 'Carpenter',
            project: 'demo-project',
            records: [
              { id: 101, date: '2026-03-30', status: 'present', time: '07:52', overtime: 1 },
              { id: 102, date: '2026-04-10', status: 'present', time: '07:48', overtime: 0 },
              { id: 103, date: '2026-04-20', status: 'present', time: '07:46', overtime: 1 },
              { id: 104, date: '2026-04-21', status: 'present', time: '07:45', overtime: 0 },
            ],
          },
        };
      }

      if (endpoint === '/api/v1/boss/employee-detail?id=2') {
        return {
          code: 200,
          message: 'success',
          data: {
            employeeId: 2,
            employeeName: 'Li Si',
            team: 'Steel Worker',
            project: 'demo-project',
            records: [
              { id: 201, date: '2026-04-01', status: 'present', time: '07:50', overtime: 0 },
              { id: 202, date: '2026-04-10', status: 'absent', time: null, overtime: 0 },
            ],
          },
        };
      }

      throw new Error(`Unhandled request in test: ${endpoint}`);
    });
  });

  it('filters the detail table by the selected time range', async () => {
    renderPage();

    await screen.findByText('2026-04-01');

    const rangeSelect = screen.getByRole('combobox', { name: 'project-attendance-time-range' });
    fireEvent.change(rangeSelect, { target: { value: 'week' } });

    await waitFor(() => {
      expect(screen.getByText('2026-04-20')).toBeInTheDocument();
      expect(screen.getByText('2026-04-21')).toBeInTheDocument();
      expect(screen.queryByText('2026-03-30')).not.toBeInTheDocument();
      expect(screen.queryByText('2026-04-01')).not.toBeInTheDocument();
      expect(screen.queryByText('2026-04-10')).not.toBeInTheDocument();
    });
  });

  it('keeps the worker list modal synced with the outer time range selector', async () => {
    renderPage();

    const outerRangeSelect = await screen.findByRole('combobox', { name: 'project-attendance-time-range' });
    fireEvent.change(outerRangeSelect, { target: { value: 'week' } });
    fireEvent.click(screen.getByText('累计出勤人次'));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith('/api/v1/boss/employee-detail?id=1');
      expect(requestMock).toHaveBeenCalledWith('/api/v1/boss/employee-detail?id=2');
    });

    const modalRangeSelect = await screen.findByRole('combobox', { name: 'worker-list-time-range' });
    expect(modalRangeSelect).toHaveValue('week');

    const workerList = screen.getByTestId('project-attendance-worker-list');
    const workerCard = within(workerList).getByText('Zhang San').closest('.bg-white');
    expect(workerCard).not.toBeNull();
    expect(workerCard?.textContent?.replace(/\s+/g, '')).toContain('2天');
    expect(within(workerList).queryByText('Li Si')).not.toBeInTheDocument();

    fireEvent.change(modalRangeSelect, { target: { value: 'month' } });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'project-attendance-time-range' })).toHaveValue('month');
      expect(within(workerList).getByText('Li Si')).toBeInTheDocument();
    });
  });
});
