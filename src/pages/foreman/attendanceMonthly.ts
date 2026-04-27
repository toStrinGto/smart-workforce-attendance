import { AttendanceLikeRecord } from '@/pages/worker/attendanceStatus';

export interface ForemanMonthlyRecord extends AttendanceLikeRecord {
  pic?: string | null;
}

type RawMonthlyRecord = {
  date?: string | null;
  status?: string | null;
  in?: string | null;
  out?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  photoUrl?: string | null;
  pic?: string | null;
  reason?: string | null;
};

type RawExceptionRecord = {
  date?: string | null;
  name?: string | null;
  reason?: string | null;
};

function isRecordMap(value: unknown): value is Record<string, RawMonthlyRecord> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && !('records' in value);
}

function normalizeDateKey(value: string | null | undefined) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function looksLikeEnglishSystemReason(value: string) {
  const stripped = value.replace(/[0-9\s.,:;!?()[\]{}\-_/]+/g, '');
  return Boolean(stripped) && /^[A-Za-z]+$/.test(stripped);
}

function normalizeRecord(record: RawMonthlyRecord): ForemanMonthlyRecord {
  const inTime = record.in ?? record.checkInTime ?? record.punchInTime ?? null;
  const outTime = record.out ?? record.checkOutTime ?? record.punchOutTime ?? null;
  const status = record.status || (!inTime || !outTime ? 'missing' : 'normal');

  return {
    status,
    in: inTime,
    out: outTime,
    pic: record.pic ?? record.photoUrl ?? null,
    reason: record.reason ?? undefined,
  };
}

export function getUserFacingForemanReason(record: ForemanMonthlyRecord | null | undefined) {
  const rawReason = typeof record?.reason === 'string' ? record.reason.trim() : '';

  if (rawReason && !looksLikeEnglishSystemReason(rawReason)) {
    return rawReason;
  }

  if (record?.status === 'recorded') {
    return '班组已记工，暂无打卡记录';
  }

  if (record?.status === 'missing') {
    return '部分工友存在缺卡记录';
  }

  return rawReason;
}

export function normalizeForemanMonthlyAttendance(input: unknown): Record<string, ForemanMonthlyRecord> {
  if (!input) return {};

  if (Array.isArray(input)) {
    return input.reduce<Record<string, ForemanMonthlyRecord>>((acc, item) => {
      const dateKey = normalizeDateKey(item?.date);
      if (dateKey) acc[dateKey] = normalizeRecord(item);
      return acc;
    }, {});
  }

  if (typeof input === 'object' && input && 'records' in input) {
    const records = (input as { records?: unknown }).records;
    return normalizeForemanMonthlyAttendance(Array.isArray(records) ? records : []);
  }

  if (isRecordMap(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([date, record]) => [date, normalizeRecord(record)]),
    );
  }

  return {};
}

export function normalizeForemanExceptionsAttendance(input: RawExceptionRecord[] = []): Record<string, ForemanMonthlyRecord> {
  const grouped = input.reduce<Record<string, string[]>>((acc, item) => {
    const dateKey = normalizeDateKey(item.date);
    if (!dateKey) return acc;
    const name = item.name || '未知工人';
    const reason = item.reason || '考勤异常';
    acc[dateKey] = [...(acc[dateKey] || []), `${name}: ${reason}`];
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([date, reasons]) => [
      date,
      {
        status: 'missing',
        in: null,
        out: null,
        pic: null,
        reason: reasons.join('；'),
      },
    ]),
  );
}
