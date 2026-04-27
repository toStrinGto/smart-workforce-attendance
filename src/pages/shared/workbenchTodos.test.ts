import { describe, expect, it } from 'vitest';
import {
  getSignInTodoState,
  getTodoActionRoute,
  hasSubmittedDailyReportToday,
  normalizeWorkbenchTodo,
} from './workbenchTodos';

describe('workbench todo actions', () => {
  it('routes the daily report todo to the daily report page', () => {
    expect(getTodoActionRoute('report')).toBe('/daily-report');
  });

  it('routes worker sign-in reminders to the punch page', () => {
    expect(getTodoActionRoute('sign-in', 'worker')).toBe('/');
  });

  it('routes foreman sign-in reminders to the attendance calendar', () => {
    expect(getTodoActionRoute('sign-in', 'foreman')).toBe('/foreman-attendance');
  });

  it('detects when a daily report has been submitted today', () => {
    expect(
      hasSubmittedDailyReportToday(
        [
          { date: '2026-04-20', status: 'submitted' },
          { date: '2026-04-21', status: '未阅' },
        ],
        new Date('2026-04-21T10:00:00+08:00'),
      ),
    ).toBe(true);
  });

  it('does not complete the daily report todo from older reports', () => {
    expect(
      hasSubmittedDailyReportToday(
        [{ date: '2026-04-20', status: 'submitted' }],
        new Date('2026-04-21T10:00:00+08:00'),
      ),
    ).toBe(false);
  });

  it('marks worker sign-in reminder complete when today punch is finished', () => {
    expect(getSignInTodoState('worker', { nextPunchType: null })).toMatchObject({
      visible: true,
      completed: true,
      buttonText: '已完成',
    });
  });

  it('shows foreman sign-in reminder when workers are missing punches', () => {
    expect(
      getSignInTodoState('foreman', undefined, {
        missing: 2,
        totalWorkers: 12,
        checkedIn: 10,
      }),
    ).toMatchObject({
      visible: true,
      completed: false,
      title: '提醒班组签到',
      buttonText: '去查看',
    });
  });

  it('maps daily report todos from backend into localized workbench cards', () => {
    expect(
      normalizeWorkbenchTodo(
        {
          id: 'daily_report:1',
          type: 'daily_report',
          title: "Submit today's daily report",
          description: 'Due by 18:00 today',
          actionUrl: '/daily-report',
          status: 'pending',
        },
        'worker',
      ),
    ).toMatchObject({
      title: '提交今日施工日报',
      description: '今天 18:00 前',
      actionLabel: '去处理',
      actionUrl: '/daily-report',
    });
  });

  it('maps reimbursement approval todos into approval actions', () => {
    expect(
      normalizeWorkbenchTodo(
        {
          id: 'reimbursement_approval:9',
          type: 'reimbursement_approval',
          title: 'Review reimbursement request',
          description: 'Amount: 500.00',
          actionUrl: '/reimbursement',
          status: 'pending',
        },
        'boss',
      ),
    ).toMatchObject({
      title: '审批报销申请',
      description: '金额：¥500.00',
      actionLabel: '去审批',
      actionUrl: '/reimbursement',
    });
  });
});
