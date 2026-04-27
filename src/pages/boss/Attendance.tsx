/**
 * Attendance.tsx
 * 老板 (Boss) 角色的考勤概览页面。
 * 展示所有项目的今日考勤汇总数据（出勤人数、缺勤人数等），并提供按项目查看详细考勤记录的入口。
 */
import React, { useState, useEffect } from 'react';
import { CalendarDays, Users, Clock, ChevronRight, Search, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { request } from '@/lib/api';

interface ProjectData {
  id: number;
  name: string;
  total: number;
  present: number;
  absent: number;
  overtime: number;
  status: string;
}

interface AttendanceData {
  summary: {
    totalPresent: number;
    presentRate: number;
    totalOvertime: number;
    overtimeGrowth: number;
  };
  projects: ProjectData[];
}

export default function BossAttendance() {
  usePageTitle('考勤总览');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        // 发送真实的 AJAX 请求获取数据
        const result = await request('/api/v1/attendance/summary');
        if (result.code === 200) {
          setData(result.data);
        } else {
          throw new Error(result.message || '获取数据失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    // 模拟网络延迟
    setTimeout(() => {
      fetchAttendanceData();
    }, 500);
  }, []);

  const filteredProjects = data?.projects.filter(p => p.name.includes(searchQuery)) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case '未开工': return 'bg-gray-100 text-gray-600 border-gray-200';
      case '施工中': return 'bg-blue-50 text-blue-600 border-blue-200';
      case '结算中': return 'bg-orange-50 text-orange-600 border-orange-200';
      case '维保中': return 'bg-purple-50 text-purple-600 border-purple-200';
      case '已完成': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative">
        <h1 className="text-lg font-bold text-center text-gray-800 mb-4">项目考勤概览</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索项目名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate('/employee-attendance')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-left text-white shadow-md cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-blue-100 text-xs mb-1 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            今日总出勤 (人)
          </div>
          <div className="text-2xl font-bold flex items-center justify-between">
            {loading ? <div className="h-8 w-16 bg-blue-400/50 animate-pulse rounded"></div> : (data?.summary.totalPresent ?? '-')}
            <ChevronRight className="w-5 h-5 text-blue-200 opacity-80" />
          </div>
          <div className="text-xs text-blue-200 mt-2">
            {loading ? <div className="h-4 w-20 bg-blue-400/50 animate-pulse rounded"></div> : `出勤率 ${data?.summary.presentRate ?? '-'}%`}
          </div>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
            查看人员考勤明细
            <ChevronRight className="ml-1 w-3.5 h-3.5" />
          </div>
        </button>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
          <div className="text-orange-100 text-xs mb-1 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            今日总加班 (小时)
          </div>
          <div className="text-2xl font-bold">
            {loading ? <div className="h-8 w-16 bg-orange-400/50 animate-pulse rounded"></div> : (data?.summary.totalOvertime ?? '-')}
          </div>
          <div className="text-xs text-orange-200 mt-2">
            {loading ? <div className="h-4 w-24 bg-orange-400/50 animate-pulse rounded"></div> : `较昨日 +${data?.summary.overtimeGrowth ?? '-'}%`}
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center">
          <CalendarDays className="w-4 h-4 text-blue-500 mr-2" />
          各项目实时考勤
        </h2>
        
        {loading ? (
          // Skeleton Loaders
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 w-1/2 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-emerald-50 rounded-lg"></div>
                <div className="h-12 bg-orange-50 rounded-lg"></div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-red-500 mb-2 text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="text-blue-500 text-sm active:opacity-70">点击重试</button>
          </div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/project-attendance/${encodeURIComponent(project.name)}`)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="font-bold text-gray-800 text-sm">{project.name}</div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg py-2">
                  <div className="text-xs text-gray-500 mb-1">总人数</div>
                  <div className="text-sm font-bold text-gray-800">{project.total}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg py-2">
                  <div className="text-xs text-emerald-600 mb-1">出勤</div>
                  <div className="text-sm font-bold text-emerald-700">{project.present}</div>
                </div>
                <div className="bg-orange-50 rounded-lg py-2">
                  <div className="text-xs text-orange-600 mb-1">加班(h)</div>
                  <div className="text-sm font-bold text-orange-700">{project.overtime}</div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-10">
            <p>未找到相关项目</p>
          </div>
        )}
      </div>
    </div>
  );
}
