export type AttendanceDisplayStatus = 'normal' | 'abnormal' | 'missing' | 'recorded';

export interface AttendanceLikeRecord {
  status?: string;
  in: string | null;
  out: string | null;
  reason?: string | null;
}

export interface AttendanceEvaluation {
  status: AttendanceDisplayStatus;
  label: string;
  inLabel: string;
  outLabel: string;
  isLate: boolean;
  isEarlyLeave: boolean;
}

const LATE_THRESHOLD_MINUTES = 9 * 60;
const EARLY_LEAVE_THRESHOLD_MINUTES = 16 * 60;

const LABELS = {
  normal: '\u6b63\u5e38',
  late: '\u8fdf\u5230',
  earlyLeave: '\u65e9\u9000',
  missing: '\u7f3a\u5361',
  noPunch: '\u672a\u6253\u5361',
  recorded: '\u5df2\u8bb0\u5de5',
};

function parseTimeToMinutes(time: string | null) {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function evaluateAttendanceRecord(record: AttendanceLikeRecord): AttendanceEvaluation {
  const inMinutes = parseTimeToMinutes(record.in);
  const outMinutes = parseTimeToMinutes(record.out);
  const hasInPunch = inMinutes !== null;
  const hasOutPunch = outMinutes !== null;
  const hasSingleSideMissing = hasInPunch !== hasOutPunch;
  const isExplicitMissing = record.status === 'missing' || record.status === 'absent';
  const hasNoPunchTimes = !hasInPunch && !hasOutPunch;

  if (hasNoPunchTimes && !isExplicitMissing) {
    return {
      status: 'recorded',
      label: LABELS.recorded,
      inLabel: LABELS.noPunch,
      outLabel: LABELS.noPunch,
      isLate: false,
      isEarlyLeave: false,
    };
  }

  if (isExplicitMissing || hasSingleSideMissing) {
    return {
      status: 'missing',
      label: LABELS.missing,
      inLabel: inMinutes === null ? LABELS.missing : LABELS.normal,
      outLabel: outMinutes === null ? LABELS.missing : LABELS.normal,
      isLate: false,
      isEarlyLeave: false,
    };
  }

  const isLate = inMinutes >= LATE_THRESHOLD_MINUTES;
  const isEarlyLeave = outMinutes < EARLY_LEAVE_THRESHOLD_MINUTES;

  if (isLate || isEarlyLeave) {
    const label = [isLate ? LABELS.late : null, isEarlyLeave ? LABELS.earlyLeave : null].filter(Boolean).join('/');
    return {
      status: 'abnormal',
      label,
      inLabel: isLate ? LABELS.late : LABELS.normal,
      outLabel: isEarlyLeave ? LABELS.earlyLeave : LABELS.normal,
      isLate,
      isEarlyLeave,
    };
  }

  return {
    status: 'normal',
    label: LABELS.normal,
    inLabel: LABELS.normal,
    outLabel: LABELS.normal,
    isLate: false,
    isEarlyLeave: false,
  };
}
