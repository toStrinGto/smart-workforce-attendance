import { describe, expect, it } from 'vitest';
import {
  getUserFacingForemanReason,
  normalizeForemanExceptionsAttendance,
  normalizeForemanMonthlyAttendance,
} from './attendanceMonthly';

describe('normalizeForemanMonthlyAttendance', () => {
  it('keeps map-shaped monthly attendance data', () => {
    expect(normalizeForemanMonthlyAttendance({
      '2026-04-21': { status: 'normal', in: '08:01', out: '18:00', pic: 'a.jpg' },
    })).toEqual({
      '2026-04-21': { status: 'normal', in: '08:01', out: '18:00', pic: 'a.jpg' },
    });
  });

  it('normalizes array-shaped backend records', () => {
    expect(normalizeForemanMonthlyAttendance([
      { date: '2026-04-21', status: 'late', checkInTime: '09:10', checkOutTime: '18:20', photoUrl: 'b.jpg' },
    ])).toEqual({
      '2026-04-21': { status: 'late', in: '09:10', out: '18:20', pic: 'b.jpg', reason: undefined },
    });
  });

  it('normalizes response objects with records', () => {
    expect(normalizeForemanMonthlyAttendance({
      records: [
        { date: '2026-04-21T00:00:00+08:00', in: '08:20', out: null, reason: '\u7f3a\u4e0b\u73ed\u5361' },
      ],
    })).toEqual({
      '2026-04-21': { status: 'missing', in: '08:20', out: null, pic: null, reason: '\u7f3a\u4e0b\u73ed\u5361' },
    });
  });

  it('builds fallback calendar data from foreman exceptions', () => {
    expect(normalizeForemanExceptionsAttendance([
      { date: '2026-04-21', name: '\u5f20\u4e09', reason: '\u672a\u6253\u5361' },
      { date: '2026-04-21', name: '\u674e\u56db', reason: '\u4e8b\u6545\u672a\u6253\u5361' },
    ])).toEqual({
      '2026-04-21': {
        status: 'missing',
        in: null,
        out: null,
        pic: null,
        reason: '\u5f20\u4e09: \u672a\u6253\u5361\uff1b\u674e\u56db: \u4e8b\u6545\u672a\u6253\u5361',
      },
    });
  });

  it('keeps recorded monthly records instead of downgrading them to missing', () => {
    expect(normalizeForemanMonthlyAttendance([
      { date: '2026-04-23', status: 'recorded', in: null, out: null, reason: null },
    ])).toEqual({
      '2026-04-23': { status: 'recorded', in: null, out: null, pic: null, reason: undefined },
    });
  });
});

describe('getUserFacingForemanReason', () => {
  it('replaces English system text with a Chinese missing fallback', () => {
    expect(getUserFacingForemanReason({
      status: 'missing',
      in: null,
      out: null,
      reason: 'Some workers have missing punch records',
    })).toBe('\u90e8\u5206\u5de5\u53cb\u5b58\u5728\u7f3a\u5361\u8bb0\u5f55');
  });

  it('fills recorded days without a reason using a Chinese fallback', () => {
    expect(getUserFacingForemanReason({
      status: 'recorded',
      in: null,
      out: null,
      reason: null,
    })).toBe('\u73ed\u7ec4\u5df2\u8bb0\u5de5\uff0c\u6682\u65e0\u6253\u5361\u8bb0\u5f55');
  });

  it('keeps existing Chinese business reasons unchanged', () => {
    expect(getUserFacingForemanReason({
      status: 'missing',
      in: '07:50',
      out: null,
      reason: '2 \u4eba\u672a\u5b8c\u6210\u7b7e\u9000',
    })).toBe('2 \u4eba\u672a\u5b8c\u6210\u7b7e\u9000');
  });
});
