import { describe, expect, it } from 'vitest';
import { evaluateAttendanceRecord } from './attendanceStatus';

describe('evaluateAttendanceRecord', () => {
  it('keeps a full day before 09:00 and after 16:00 as normal', () => {
    expect(evaluateAttendanceRecord({ status: 'normal', in: '08:59', out: '16:00' })).toMatchObject({
      status: 'normal',
      label: '\u6b63\u5e38',
      inLabel: '\u6b63\u5e38',
      outLabel: '\u6b63\u5e38',
    });
  });

  it('marks a worker as late when they did not punch in before 09:00', () => {
    expect(evaluateAttendanceRecord({ status: 'normal', in: '09:00', out: '18:00' })).toMatchObject({
      status: 'abnormal',
      label: '\u8fdf\u5230',
      inLabel: '\u8fdf\u5230',
      outLabel: '\u6b63\u5e38',
    });
  });

  it('marks a worker as early leave when they punch out before 16:00', () => {
    expect(evaluateAttendanceRecord({ status: 'normal', in: '08:30', out: '15:59' })).toMatchObject({
      status: 'abnormal',
      label: '\u65e9\u9000',
      inLabel: '\u6b63\u5e38',
      outLabel: '\u65e9\u9000',
    });
  });

  it('marks both late and early leave when both thresholds are violated', () => {
    expect(evaluateAttendanceRecord({ status: 'normal', in: '09:10', out: '15:30' })).toMatchObject({
      status: 'abnormal',
      label: '\u8fdf\u5230/\u65e9\u9000',
      inLabel: '\u8fdf\u5230',
      outLabel: '\u65e9\u9000',
    });
  });

  it('marks only one-sided punches as missing', () => {
    expect(evaluateAttendanceRecord({ status: 'normal', in: '08:50', out: null })).toMatchObject({
      status: 'missing',
      label: '\u7f3a\u5361',
      outLabel: '\u7f3a\u5361',
    });
  });

  it('keeps recorded days distinct while showing neutral detail badges', () => {
    expect(evaluateAttendanceRecord({ status: 'recorded', in: null, out: null })).toMatchObject({
      status: 'recorded',
      label: '\u5df2\u8bb0\u5de5',
      inLabel: '\u672a\u6253\u5361',
      outLabel: '\u672a\u6253\u5361',
    });
  });

  it('still keeps explicitly missing records as red missing cases', () => {
    expect(evaluateAttendanceRecord({ status: 'missing', in: null, out: null })).toMatchObject({
      status: 'missing',
      label: '\u7f3a\u5361',
    });
  });
});
