/**
 * ReimbursementOverview.tsx
 * 老板 (Boss) 角色的全局报销概览页面。
 * 提供公司所有项目的报销数据汇总，支持按时间维度（月/季/年/全部）查看，并列出各项目的报销总额及审批状态。
 */
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
// useNavigate 用于页面跳转
import { useNavigate } from 'react-router-dom';
// 引入 UI 图标
import { ArrowLeft, Search, Banknote, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
// 引入动画库，用于列表项的平滑出现和消失
import { motion, AnimatePresence } from 'framer-motion';
// 引入封装好的网络请求工具
import { request } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  buildReimbursementOverviewDisplayData,
  ReimbursementOverviewData,
} from './reimbursementTransforms';

export default function BossReimbursementOverview() {
  usePageTitle('报销总览');
  const navigate = useNavigate(); // 获取路由跳转函数

  // 定义组件的状态 (State)
  // allData: 存储从后端获取的全部报销概览数据
  const [allData, setAllData] = useState<ReimbursementOverviewData | null>(null);
  // loading: 标记当前是否正在请求数据，用于显示骨架屏（加载动画）
  const [loading, setLoading] = useState(true);
  // searchQuery: 存储搜索框中输入的关键字
  const [searchQuery, setSearchQuery] = useState('');
  // timeFilter: 时间筛选状态
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
  // visibleCount: 控制显示的项目数量（解决项目过多的问题）
  const [visibleCount, setVisibleCount] = useState(10);

  // useEffect 钩子：在组件首次渲染到屏幕上时执行一次
  useEffect(() => {
    // 每次进入页面时，将滚动条重置到最顶部
    window.scrollTo(0, 0);

    // 定义一个异步函数来获取数据
    const fetchData = async () => {
      setLoading(true); // 开始请求，设置为加载中状态
      try {
        // 发起网络请求获取报销概览数据（获取全部数据）
        const res = await request('/api/v1/reimbursement/overview');
        if (res.code === 200) {
          setAllData(res.data); // 请求成功，将全部数据保存到 state 中
        }
      } catch (err) {
        console.error('获取报销概览失败:', err); // 请求失败，在控制台打印错误
      } finally {
        setLoading(false); // 无论成功还是失败，请求结束，取消加载中状态
      }
    };

    fetchData(); // 调用上面定义的函数
  }, []); // 空依赖数组 [] 表示这个 useEffect 只在组件挂载时执行一次

  // 前端自动识别和处理数据：根据时间筛选条件动态计算展示数据
  const displayData = useMemo(() => {
    return buildReimbursementOverviewDisplayData(allData, timeFilter);
  }, [allData, timeFilter]);

  // 根据搜索框输入的关键字，过滤项目列表
  // 如果 searchQuery 为空，则显示所有项目；如果不为空，则只显示名称包含关键字的项目
  const filteredProjects = displayData?.projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 截取当前需要显示的项目（分页/加载更多逻辑）
  const paginatedProjects = filteredProjects.slice(0, visibleCount);

  // 渲染骨架屏：在数据还没加载出来时，显示占位的灰色闪烁块，提升用户体验
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
            <div className="h-2 bg-gray-100 rounded-full w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* 顶部区域 (Header) */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 pt-12 pb-6 px-4 rounded-b-3xl shadow-lg text-white sticky top-0 z-20">
        {/* 标题栏和返回按钮 */}
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold">报销概览</h1>
        </div>
        
        {/* 时间筛选器 */}
        <div className="flex bg-white/20 p-1 rounded-lg mb-6 w-full max-w-[280px]">
          <button onClick={() => setTimeFilter('month')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-colors", timeFilter === 'month' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本月</button>
          <button onClick={() => setTimeFilter('quarter')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-colors", timeFilter === 'quarter' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本季</button>
          <button onClick={() => setTimeFilter('year')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-colors", timeFilter === 'year' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本年</button>
          <button onClick={() => setTimeFilter('all')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-colors", timeFilter === 'all' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>全部</button>
        </div>
        
        {/* 汇总数据展示 */}
        <div className="mb-2">
          <div className="text-emerald-100 text-sm mb-1">
            {timeFilter === 'month' ? '本月' : timeFilter === 'quarter' ? '本季' : timeFilter === 'year' ? '本年' : '全部'}累计报销总额
          </div>
          <div className="text-3xl font-bold">
            {/* 如果正在加载，显示骨架块；否则显示真实金额 */}
            {loading ? <div className="h-9 w-32 bg-white/20 rounded animate-pulse"></div> : `¥ ${displayData?.summary.totalAmount}`}
          </div>
        </div>
        
        {/* 三个状态的统计卡片 (待审批、已通过、已驳回) */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
            <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center">
              <Clock className="w-3 h-3 mr-1" /> 待审批
            </div>
            <div className="text-lg font-bold">
              {loading ? <div className="h-6 w-8 mx-auto bg-white/20 rounded animate-pulse"></div> : displayData?.summary.pendingCount}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
            <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 mr-1" /> 已通过
            </div>
            <div className="text-lg font-bold">
              {loading ? <div className="h-6 w-8 mx-auto bg-white/20 rounded animate-pulse"></div> : displayData?.summary.approvedCount}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
            <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center">
              <XCircle className="w-3 h-3 mr-1" /> 已驳回
            </div>
            <div className="text-lg font-bold">
              {loading ? <div className="h-6 w-8 mx-auto bg-white/20 rounded animate-pulse"></div> : displayData?.summary.rejectedCount}
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-4 py-4 sticky top-[200px] z-10 bg-gray-50/80 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {/* 输入框绑定了 searchQuery 状态，输入内容改变时触发 onChange 更新状态 */}
          <input
            type="text"
            placeholder="搜索项目名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 项目列表区域 */}
      <div className="px-4">
        {loading ? renderSkeleton() : (
          <div className="space-y-3">
            {/* AnimatePresence 用于在列表项被过滤掉（移除）时提供退出动画 */}
            <AnimatePresence mode="popLayout">
              {/* 遍历过滤并分页后的项目列表并渲染 */}
              {paginatedProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout // 让元素位置改变时有平滑的过渡动画
                  initial={{ opacity: 0, y: 20 }} // 初始状态：透明且向下偏移
                  animate={{ opacity: 1, y: 0 }} // 动画状态：完全不透明且回到原位
                  exit={{ opacity: 0, scale: 0.95 }} // 退出状态：变透明且稍微缩小
                  // 点击卡片时，跳转到该项目的报销详情页，并将项目名称作为 URL 参数传递
                  onClick={() => navigate(`/boss/reimbursement-project/${encodeURIComponent(project.name)}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1 flex-1 pr-2 text-base">{project.name}</h3>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-sm text-gray-500">
                      <span className="text-orange-500 font-medium">{project.pendingCount}</span> 笔待审批 / <span className="text-emerald-500 font-medium">{project.approvedCount}</span> 笔已通过
                    </div>
                    <div className="text-lg font-bold text-emerald-600">¥ {project.totalAmount}</div>
                  </div>

                  {/* 进度条展示 */}
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${project.percent}%` }} // 根据数据动态设置宽度
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* 加载更多按钮（解决项目数量太多的问题） */}
            {visibleCount < filteredProjects.length && (
              <div className="pt-2 pb-6">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="w-full py-3 bg-white border border-gray-200 text-emerald-600 font-medium rounded-xl shadow-sm active:bg-gray-50 transition-colors"
                >
                  加载更多项目 ({filteredProjects.length - visibleCount})
                </button>
              </div>
            )}

            {/* 如果搜索后没有匹配的项目，显示空状态提示 */}
            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Banknote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无相关项目报销记录</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
