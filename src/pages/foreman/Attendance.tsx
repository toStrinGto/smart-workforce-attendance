import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { request } from '@/lib/api';
import { cn, extractList } from '@/lib/utils';
import { AttendanceDisplayStatus, evaluateAttendanceRecord } from '@/pages/worker/attendanceStatus';
import {
  ForemanMonthlyRecord,
  getUserFacingForemanReason,
  normalizeForemanExceptionsAttendance,
  normalizeForemanMonthlyAttendance,
} from './attendanceMonthly';

function getCalendarDotClass(status: AttendanceDisplayStatus) {
  if (status === 'normal') return 'bg-emerald-400';
  if (status === 'abnormal') return 'bg-amber-400';
  if (status === 'recorded') return 'bg-emerald-400';
  return 'bg-red-400';
}

function getBadgeClass(label: string) {
  if (label === '正常') return 'text-emerald-600 bg-emerald-50';
  if (label === '缺卡') return 'text-red-600 bg-red-50';
  if (label === '已记工' || label === '未打卡') return 'text-gray-500 bg-gray-100';
  return 'text-amber-600 bg-amber-50';
}

export default function ForemanAttendance() {
  usePageTitle('考勤日历');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, ForemanMonthlyRecord>>({});
  const [monthLoading, setMonthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonth = async () => {
    try {
      setMonthLoading(true);
      setError(null);
      const month = format(currentDate, 'yyyy-MM');
      const res = await request<unknown>(`/api/v1/foreman/attendance/monthly?month=${month}`);
      setAttendanceData(normalizeForemanMonthlyAttendance(res.data));
    } catch (err) {
      try {
        const fallback = await request<unknown[]>('/api/v1/foreman/exceptions');
        setAttendanceData(normalizeForemanExceptionsAttendance(extractList(fallback.data)));
        setError('班组月考勤接口暂不可用，当前显示异常处理数据');
      } catch {
        setAttendanceData({});
        setError(err instanceof Error ? err.message : '获取班组考勤失败');
      }
    } finally {
      setMonthLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth();
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array.from({ length: startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 });
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedRecord = selectedDateKey ? attendanceData[selectedDateKey] : null;
  const selectedEvaluation = selectedRecord ? evaluateAttendanceRecord(selectedRecord) : null;
  const selectedReason = selectedRecord ? getUserFacingForemanReason(selectedRecord) : '';

  return (
    <div className="flex min-h-full flex-col bg-gray-50 pb-4">
      <div className="relative z-10 bg-white px-4 pb-4 pt-12 shadow-sm">
        <h1 className="mb-4 text-center text-lg font-bold text-gray-800">班组考勤</h1>
        <div className="flex items-center justify-between px-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center text-base font-bold text-gray-800">
            <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </div>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-b-3xl bg-white px-4 pb-6 shadow-sm">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-x-1 gap-y-4">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="h-10"></div>
          ))}
          {daysInMonth.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = attendanceData[dateStr];
            const evaluation = record ? evaluateAttendanceRecord(record) : null;
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'relative flex h-10 flex-col items-center justify-center rounded-full transition-all',
                  isSelected ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-orange-50',
                  isToday(day) && !isSelected && 'bg-orange-50/50 font-bold text-orange-500',
                )}
              >
                <span className="text-sm">{format(day, 'd')}</span>
                {record && evaluation && (
                  <div className={cn('absolute bottom-1 h-1.5 w-1.5 rounded-full', getCalendarDotClass(evaluation.status))}></div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            <div className="flex items-start">
              <AlertCircle className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchMonth} className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600">
              <RefreshCw className="mr-1 inline-block h-3 w-3" />
              重试
            </button>
          </div>
        )}

        {monthLoading && (
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400">
            正在加载班组考勤...
          </div>
        )}
      </div>

      <div className="mb-6 flex justify-center space-x-6">
        <div className="flex items-center text-xs text-gray-500">
          <div className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400"></div> 正常
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <div className="mr-1.5 h-2 w-2 rounded-full bg-amber-400"></div> 迟到/早退
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <div className="mr-1.5 h-2 w-2 rounded-full bg-red-400"></div> 缺卡
        </div>
      </div>

      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-16 left-0 right-0 z-50 flex max-h-[85%] flex-col rounded-t-3xl bg-white shadow-2xl"
            >
              <div className="flex w-full justify-center pb-4 pt-4">
                <div className="h-1.5 w-12 rounded-full bg-gray-200"></div>
              </div>
              <div className="overflow-y-auto px-6 pb-6 no-scrollbar">
                <h3 className="mb-4 text-lg font-bold text-gray-800">
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })} 班组考勤
                </h3>

                {selectedRecord && selectedEvaluation ? (
                  <div className="space-y-6">
                    <div className="relative flex">
                      <div className="absolute bottom-[-24px] left-[11px] top-6 w-0.5 bg-gray-100"></div>
                      <div
                        className={cn(
                          'z-10 mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          selectedEvaluation.inLabel === '缺卡'
                            ? 'bg-red-100'
                            : selectedEvaluation.inLabel === '迟到'
                              ? 'bg-amber-100'
                              : selectedEvaluation.inLabel === '未打卡'
                                ? 'bg-gray-100'
                                : 'bg-emerald-100',
                        )}
                      >
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            selectedEvaluation.inLabel === '缺卡'
                              ? 'bg-red-500'
                              : selectedEvaluation.inLabel === '迟到'
                                ? 'bg-amber-500'
                                : selectedEvaluation.inLabel === '未打卡'
                                  ? 'bg-gray-400'
                                  : 'bg-emerald-500',
                          )}
                        ></div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-800">上班签到</div>
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <Clock className="mr-1 h-3 w-3" />
                              {selectedRecord.in || '--:--'}
                            </div>
                          </div>
                          <span className={cn('rounded px-2 py-1 text-xs font-medium', getBadgeClass(selectedEvaluation.inLabel))}>
                            {selectedEvaluation.inLabel}
                          </span>
                        </div>
                        <div className="mb-2 flex items-center text-xs text-gray-500">
                          <MapPin className="mr-1 h-3 w-3" /> 班组现场
                        </div>
                        {selectedRecord.pic && (
                          <img
                            src={selectedRecord.pic}
                            alt="签到照片"
                            className="h-16 w-16 cursor-pointer rounded-lg border border-gray-100 object-cover transition-transform active:scale-95"
                            referrerPolicy="no-referrer"
                            onClick={() => selectedRecord.pic && setPreviewImage(selectedRecord.pic)}
                          />
                        )}
                      </div>
                    </div>

                    <div className="relative flex">
                      <div
                        className={cn(
                          'z-10 mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          selectedEvaluation.outLabel === '缺卡'
                            ? 'bg-red-100'
                            : selectedEvaluation.outLabel === '早退'
                              ? 'bg-amber-100'
                              : selectedEvaluation.outLabel === '未打卡'
                                ? 'bg-gray-100'
                                : 'bg-orange-100',
                        )}
                      >
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            selectedEvaluation.outLabel === '缺卡'
                              ? 'bg-red-500'
                              : selectedEvaluation.outLabel === '早退'
                                ? 'bg-amber-500'
                                : selectedEvaluation.outLabel === '未打卡'
                                  ? 'bg-gray-400'
                                  : 'bg-orange-500',
                          )}
                        ></div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-800">下班签退</div>
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <Clock className="mr-1 h-3 w-3" />
                              {selectedRecord.out || '--:--'}
                            </div>
                          </div>
                          <span className={cn('rounded px-2 py-1 text-xs font-medium', getBadgeClass(selectedEvaluation.outLabel))}>
                            {selectedEvaluation.outLabel}
                          </span>
                        </div>
                        {selectedReason && (
                          <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">{selectedReason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-400">
                    <CalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-20" />
                    <p>当日暂无班组考勤记录</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          >
            <button
              className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:text-white"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewImage}
              alt="预览照片"
              className="w-full max-h-[80vh] object-contain"
              onClick={(event) => event.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
