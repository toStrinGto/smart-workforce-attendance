/**
 * ProjectList.tsx
 * 老板 (Boss) 角色的项目列表页面。
 * 供老板查看所有项目的列表，通常作为其他功能（如考勤、报销、结算）选择目标项目的入口页面。
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Building2, User, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/api';
import { extractList } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  manager: string;
  startDate: string;
  status: string;
  budget: number;
}

export default function BossProjectList() {
  usePageTitle('项目列表');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await request('/api/v1/projects');
        if (res.code === 200) {
          setData(extractList(res.data));
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Update URL when filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    if (newStatus === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newStatus);
    }
    setSearchParams(searchParams);
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.manager.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-100 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">项目列表</h1>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[52px] z-10 flex space-x-2 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索项目名称或负责人..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
        >
          <option value="all">全部状态</option>
          <option value="未开工">未开工</option>
          <option value="施工中">施工中</option>
          <option value="结算中">结算中</option>
          <option value="维保中">维保中</option>
          <option value="已完成">已完成</option>
        </select>
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? renderSkeleton() : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredData.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">负责人：{project.manager}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredData.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无相关项目</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
