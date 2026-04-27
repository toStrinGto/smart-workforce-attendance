/**
 * Home.tsx (Worker)
 * 工人 (Worker) 角色的首页/打卡页面。
 * 核心功能是提供上下班打卡操作，显示当前时间、定位信息以及今日的打卡状态记录。
 */
import { useState, useEffect } from 'react';
import { MapPin, Clock, Camera, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { RequestError } from '@/lib/api';
import { workerApi, WorkerTodayStatus, PunchType } from '@/services/worker';

const IS_MOCK = import.meta.env.VITE_MOCK_ENABLED === 'true';
const MOCK_COORDS = { latitude: 31.2304, longitude: 121.4737 };

function getPunchLabel(type: PunchType | null) {
  if (type === 'in') return '上班打卡';
  if (type === 'out') return '下班打卡';
  return '今日已完成';
}

function getRecordLabel(type: PunchType) {
  return type === 'in' ? '上班打卡' : '下班打卡';
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    present: '正常',
    normal: '正常',
    late: '迟到',
    early_leave: '早退',
    missing_in: '缺上班卡',
    missing_out: '缺下班卡',
    absent: '缺勤',
  };
  return map[status] || status;
}

async function getCurrentCoords() {
  if (!navigator.geolocation) {
    if (IS_MOCK) return MOCK_COORDS;
    throw new Error('当前浏览器不支持定位');
  }

  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        if (IS_MOCK) {
          resolve(MOCK_COORDS);
          return;
        }
        reject(new Error('定位失败，请允许浏览器获取当前位置后再打卡'));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export default function WorkerHome() {
  usePageTitle('打卡');
  const authUser = useAuthStore((s) => s.user);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStatus, setTodayStatus] = useState<WorkerTodayStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayStatus = async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const res = await workerApi.getTodayStatus();
      setTodayStatus(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取今日打卡状态失败');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadTodayStatus();
  }, []);

  const handlePunch = async () => {
    if (!todayStatus?.nextPunchType || isPunching) return;

    setIsPunching(true);
    setError(null);

    try {
      const coords = await getCurrentCoords();
      await workerApi.punch({
        type: todayStatus.nextPunchType,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      await loadTodayStatus();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      if (err instanceof RequestError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : '打卡失败，请稍后重试');
      }
    } finally {
      setIsPunching(false);
    }
  };

  const workerName = todayStatus?.worker?.name || authUser?.name || '工人';
  const workerRole = todayStatus?.worker?.role || '工人';
  const projectName = todayStatus?.project?.name || '暂无项目';
  const distanceText = typeof todayStatus?.distanceMeters === 'number'
    ? `误差${Math.round(todayStatus.distanceMeters)}米`
    : '范围校验通过';
  const nextPunchType = todayStatus?.nextPunchType ?? null;
  const records = todayStatus?.records ?? [];

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-400 pt-12 pb-6 px-4 rounded-b-3xl shadow-md text-white">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">智工考勤</h1>
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            <span>当前项目: {loadingStatus ? '加载中' : projectName}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
            {workerName[0]}
          </div>
          <div>
            <div className="font-medium text-lg">{workerName} ({workerRole})</div>
            <div className="text-sm text-white/80">按时打卡，工时更安心</div>
          </div>
        </div>
      </div>

      {/* Main Punch Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 mt-4">
        <div className="text-4xl font-bold text-gray-800 mb-2 font-mono tracking-tight">
          {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className={`flex items-center text-sm mb-4 px-3 py-1 rounded-full ${
          todayStatus?.inRange === false ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
        }`}>
          {todayStatus?.inRange === false ? (
            <AlertCircle className="w-4 h-4 mr-1" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mr-1" />
          )}
          {loadingStatus ? '正在获取打卡状态...' : todayStatus?.inRange === false ? '暂未进入打卡范围' : `已进入打卡范围 (${distanceText})`}
        </div>

        {error && (
          <div className="mb-4 w-full max-w-xs rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <AnimatePresence>
            {(isPunching || loadingStatus) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center z-10"
              >
                {isPunching ? (
                  <Camera className="w-12 h-12 text-white animate-pulse" />
                ) : (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handlePunch}
            disabled={loadingStatus || isPunching || !nextPunchType || todayStatus?.inRange === false}
            className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_10px_30px_rgba(249,115,22,0.4)] flex flex-col items-center justify-center text-white active:scale-95 transition-transform disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="text-2xl font-bold mb-1">{loadingStatus ? '加载中' : getPunchLabel(nextPunchType)}</span>
            <span className="text-sm opacity-90">拍照并定位</span>
          </button>
        </div>

        {error && (
          <button
            onClick={loadTodayStatus}
            disabled={loadingStatus}
            className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm border border-orange-100 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            重新获取状态
          </button>
        )}
      </div>

      {/* Today's Records */}
      <div className="px-4 mt-8">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-1 text-orange-500" />
          今日打卡记录
        </h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          {records.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">暂无打卡记录</div>
          ) : (
            records.map((record, index) => (
              <div key={record.id ?? `${record.type}-${record.time}-${index}`} className="flex justify-between items-center border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{getRecordLabel(record.type)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{record.time}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  {getStatusLabel(record.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 z-50"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">打卡成功！辛苦了</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
