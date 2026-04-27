import { describe, expect, it } from 'vitest';
import {
  buildProjectReimbursementDisplayData,
  buildReimbursementOverviewDisplayData,
  normalizeReimbursementStatus,
} from './reimbursementTransforms';

describe('reimbursementTransforms', () => {
  it('builds project reimbursement display data from numeric backend amounts', () => {
    const display = buildProjectReimbursementDisplayData({
      projectName: '绿地中心二期项目部',
      summary: {
        totalAmount: 5572.33,
        pendingAmount: 0,
        approvedAmount: 5572.33,
      },
      categories: [
        { name: '材料费', amount: 4300, percent: 77 },
        { name: 'materials', amount: 22.33, percent: 0 },
      ],
      recentRecords: [
        {
          id: '1',
          applicant: '张三',
          category: 'materials',
          amount: 12.34,
          date: '2026-04-21',
          status: '已批准',
          reason: 'cli retest',
          images: [],
        },
      ],
    }, 'all');

    expect(display?.summary.totalAmount).toBe('5,572.33');
    expect(display?.categories[1]).toMatchObject({
      amount: '22.33',
      percent: 0.4,
      percentLabel: '0.4%',
    });
    expect(display?.recentRecords[0].status).toBe('approved');
  });

  it('scales project reimbursement data for month filter without string replace errors', () => {
    const display = buildProjectReimbursementDisplayData({
      projectName: '绿地中心二期项目部',
      summary: {
        totalAmount: 5572.33,
        pendingAmount: 0,
        approvedAmount: 5572.33,
      },
      categories: [],
      recentRecords: [],
    }, 'month');

    expect(display?.summary.totalAmount).toBe('1,114.47');
    expect(display?.summary.approvedAmount).toBe('1,114.47');
  });

  it('builds reimbursement overview display data from numeric totals', () => {
    const display = buildReimbursementOverviewDisplayData({
      summary: {
        totalAmount: 5775.33,
        pendingCount: 0,
        approvedCount: 9,
        rejectedCount: 4,
      },
      projects: [
        { id: 1, name: '绿地中心二期项目部', totalAmount: 5572.33, pendingCount: 0, approvedCount: 7, percent: 96 },
        { id: 2, name: '万达广场三期', totalAmount: 0, pendingCount: 0, approvedCount: 0, percent: 0 },
      ],
    }, 'month');

    expect(display?.summary.totalAmount).toBe('1,155.07');
    expect(display?.projects[0]).toMatchObject({
      totalAmount: '1,114.47',
      percent: 96,
    });
  });

  it('normalizes localized reimbursement statuses', () => {
    expect(normalizeReimbursementStatus('待审批')).toBe('pending');
    expect(normalizeReimbursementStatus('已批准')).toBe('approved');
    expect(normalizeReimbursementStatus('已驳回')).toBe('rejected');
  });
});
