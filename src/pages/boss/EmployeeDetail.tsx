/**
 * EmployeeDetail.tsx
 * 老板 (Boss) 角色的员工考勤详情页面。
 * 展示单个员工在特定月份的详细考勤记录（每日打卡时间、状态）以及月度考勤统计图表。
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, UserCheck, Clock, Filter, BarChart2, List, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { request } from '@/lib/api';

const TIME_RANGES = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
  { value: 'year', label: '本年' },
  { value: 'all', label: '全部' },
];

export default function BossEmployeeDetail() {
  usePageTitle('员工详情');
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('month');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<any[]>([]);

  // Reset page when timeRange changes
  useEffect(() => {
    setCurrentPage(1);
  }, [timeRange]);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const json = await request(`/api/v1/boss/employee-detail?id=${id || '1'}`);
        setAllRecords(json.data.records || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [id]);

  // Filter data based on selected range
  const { days, records, stats } = useMemo(() => {
    let daysCount = 30;
    switch(timeRange) {
      case 'week': daysCount = 7; break;
      case 'month': daysCount = 30; break;
      case 'quarter': daysCount = 90; break;
      case 'year': daysCount = 365; break;
      case 'all': daysCount = allRecords.length; break;
    }

    const filteredRecords = allRecords.slice(0, daysCount);

    const calculatedStats = {
      present: filteredRecords.filter(r => r.status === 'present').length,
      absent: filteredRecords.filter(r => r.status === 'absent').length,
      overtime: filteredRecords.reduce((acc, r) => acc + r.overtime, 0),
    };

    return { days: daysCount, records: filteredRecords, stats: calculatedStats };
  }, [timeRange, allRecords]);

  const attendanceRate = days > 0 ? ((stats.present / days) * 100).toFixed(1) : '0.0';

  // Pagination logic
  const totalPages = Math.ceil(records.length / pageSize);
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 active:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">员工考勤明细</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center text-gray-600 text-sm font-medium">
          <Filter className="w-4 h-4 mr-1.5 text-blue-500" />
          条件筛选
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 outline-none font-medium"
        >
          {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl shadow-sm text-white">
          <div className="text-emerald-100 text-xs mb-1 flex items-center">
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            出勤天数
          </div>
          <div className="text-2xl font-bold">
            {loading ? <div className="h-8 w-16 bg-emerald-400/50 animate-pulse rounded"></div> : <>{stats.present} <span className="text-sm font-normal opacity-80">天</span></>}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl shadow-sm text-white">
          <div className="text-orange-100 text-xs mb-1 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" />
            加班时长
          </div>
          <div className="text-2xl font-bold">
            {loading ? <div className="h-8 w-16 bg-orange-400/50 animate-pulse rounded"></div> : <>{stats.overtime} <span className="text-sm font-normal opacity-80">小时</span></>}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center">
            <BarChart2 className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-bold text-gray-800">数据汇总</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-600">
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-3">应出勤天数</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{days} 天</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-3">实际出勤</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{stats.present} 天</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-3">缺勤/请假</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{stats.absent} 天</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-3">累计加班</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-500">{stats.overtime} 小时</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">出勤率</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">{attendanceRate}%</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detailed List */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center">
              <List className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-bold text-gray-800">详细记录</span>
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 outline-none focus:border-blue-500"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
              <thead className="text-xs text-gray-500 bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">打卡时间</th>
                  <th className="px-4 py-3 font-medium text-right">加班(h)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-12"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-8 ml-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  paginatedRecords.map((record, index) => (
                    <motion.tr 
                      key={record.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{record.date}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium", 
                          record.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        )}>
                          {record.status === 'present' ? '出勤' : '缺勤'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{record.time || '-'}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium">
                        {record.overtime > 0 ? record.overtime : '-'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="p-1 text-gray-500 disabled:opacity-30 active:bg-gray-200 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs text-gray-500 font-medium">
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="p-1 text-gray-500 disabled:opacity-30 active:bg-gray-200 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
