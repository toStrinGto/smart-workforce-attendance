import { describe, expect, it } from 'vitest';
import { normalizeProjectCostResponse } from './projectCostData';

describe('normalizeProjectCostResponse', () => {
  it('accepts the real backend flat payload shape', () => {
    expect(normalizeProjectCostResponse({
      attendance: [{ workerId: 1, date: '2026-04-22', dayShift: 1, overtimeHours: 0 }],
      reimbursements: [{ id: 1, amount: 200, description: '交通费', date: '2026-04-22' }],
      workers: [{ id: 1, name: '张三', role: '木工', avatar: '张', dailyWage: 400 }],
    }, 1)).toEqual({
      attendance: [{ workerId: 1, date: '2026-04-22', dayShift: 1, overtimeHours: 0 }],
      reimbursements: [{ id: 1, amount: 200, description: '交通费', date: '2026-04-22' }],
      workers: [{ id: 1, name: '张三', role: '木工', avatar: '张', dailyWage: 400 }],
    });
  });

  it('keeps compatibility with the old mock keyed payload shape', () => {
    expect(normalizeProjectCostResponse({
      '1': {
        attendance: [{ workerId: 1, date: '2026-04-22', dayShift: 1, overtimeHours: 0 }],
        reimbursements: [],
        workers: [{ id: 1, name: '张三', role: '木工', avatar: '张', dailyWage: 400 }],
      },
    }, 1)).toEqual({
      attendance: [{ workerId: 1, date: '2026-04-22', dayShift: 1, overtimeHours: 0 }],
      reimbursements: [],
      workers: [{ id: 1, name: '张三', role: '木工', avatar: '张', dailyWage: 400 }],
    });
  });

  it('falls back to empty arrays when payload is missing', () => {
    expect(normalizeProjectCostResponse(undefined, 1)).toEqual({
      attendance: [],
      reimbursements: [],
      workers: [],
    });
  });
});
