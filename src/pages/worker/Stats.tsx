/**
 * Stats.tsx (Worker)
 * 工人 (Worker) 角色的个人统计页面。
 * 展示工人的月度出勤统计数据（如出勤天数、总工时等），帮助工人了解自己的工作情况。
 */
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, Clock, CalendarDays, TrendingUp, Wallet, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { format, subMonths, addMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { request } from '@/lib/api';

interface StatsData {
  normalDays: number;
  overtimeHours: number;
  abnormalDays: number;
  totalEarnings: number;
}

export default function WorkerStats() {
  usePageTitle('月度统计');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const month = format(currentMonth, 'yyyy-MM');
        const res = await request<StatsData>(`/api/v1/worker/stats?month=${month}`);
        if (res.code === 200) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-400 pt-12 pb-16 px-4 rounded-b-3xl shadow-md text-white relative">
        <h1 className="text-lg font-bold text-center mb-6">考勤统计</h1>

        <div className="flex justify-between items-center px-8">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-lg font-bold flex items-center">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-8 relative z-10 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : stats ? (
          <>
            {/* Main Stats */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="flex-1 text-center border-r border-gray-100">
                <div className="flex items-center justify-center text-gray-500 text-xs mb-2">
                  <CalendarDays className="w-3.5 h-3.5 mr-1" /> 出勤天数
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {stats.normalDays} <span className="text-xs font-normal text-gray-500">天</span>
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center text-gray-500 text-xs mb-2">
                  <Clock className="w-3.5 h-3.5 mr-1" /> 加班时长
                </div>
                <div className="text-2xl font-bold text-orange-500">
                  {stats.overtimeHours} <span className="text-xs font-normal text-gray-500">小时</span>
                </div>
              </div>
            </div>

            {/* Detailed List */}
            <h3 className="text-sm font-bold text-gray-800 pt-2 px-1 flex items-center">
              <BarChart3 className="w-4 h-4 mr-1.5 text-orange-500" />
              统计明细
            </h3>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">正常出勤</div>
                    <div className="text-xs text-gray-500 mt-0.5">按标准工时计算</div>
                  </div>
                </div>
                <div className="text-base font-bold text-gray-800">{stats.normalDays}天</div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">加班工时</div>
                    <div className="text-xs text-gray-500 mt-0.5">超出标准工时部分</div>
                  </div>
                </div>
                <div className="text-base font-bold text-orange-500">{stats.overtimeHours}h</div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <CalendarDays className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">异常考勤</div>
                    <div className="text-xs text-gray-500 mt-0.5">迟到/早退/缺卡</div>
                  </div>
                </div>
                <div className="text-base font-bold text-red-500">{stats.abnormalDays}次</div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <Wallet className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">累计收入</div>
                    <div className="text-xs text-gray-500 mt-0.5">本月应得</div>
                  </div>
                </div>
                <div className="text-base font-bold text-green-600">¥{stats.totalEarnings}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
