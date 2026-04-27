/**
 * ProjectReimbursementDetail.tsx
 * 老板 (Boss) 角色的项目报销明细页面。
 * 展示特定项目下的报销统计数据（按分类）和详细的报销记录列表，支持按时间（月/季/年/全部）、状态和关键字进行过滤。
 */
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
// useParams 用于获取 URL 路径中的参数（例如项目名称）
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PieChart, List, Receipt, User, Calendar, CheckCircle, Clock, Search, ChevronRight, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  buildProjectReimbursementDisplayData,
  ProjectReimbursementData,
  ProjectReimbursementDisplayData,
  ReimbursementStatus,
} from './reimbursementTransforms';

export default function BossProjectReimbursementDetail() {
  usePageTitle('项目报销详情');
  const navigate = useNavigate();
  // useParams 会解析 URL 中的 /boss/reimbursement-project/:projectName
  // 提取出 projectName 变量供我们使用
  const { projectName } = useParams<{ projectName: string }>();

  // 定义组件状态
  const [loading, setLoading] = useState(true);
  // activeTab 用于控制当前显示的是 "分类统计" (overview) 还是 "报销明细" (records)
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');

  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
  
  // 选中的记录，用于显示详情弹窗
  const [selectedRecord, setSelectedRecord] = useState<ProjectReimbursementDisplayData['recentRecords'][number] | null>(null);

  // 存储从后端获取的全部原始数据
  const [allData, setAllData] = useState<ProjectReimbursementData | null>(null);

  // 监听 projectName 的变化，当进入不同项目时重新获取数据
  useEffect(() => {
    window.scrollTo(0, 0); // 页面置顶
    const fetchData = async () => {
      setLoading(true);
      try {
        const decodedProjectName = projectName ? decodeURIComponent(projectName) : '';
        if (!decodedProjectName) {
          setAllData(null);
          return;
        }
        const res = await request<ProjectReimbursementData>(
          `/api/v1/reimbursement/project-detail?projectName=${encodeURIComponent(decodedProjectName)}`
        );
        if (res.code === 200) {
          // 将获取到的全部数据存入 state
          setAllData({ ...res.data, projectName: res.data.projectName || decodedProjectName });
        }
      } catch (err) {
        console.error('获取项目报销详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectName]); 

  // 前端自动识别和处理数据：根据时间筛选条件动态过滤记录并重新计算汇总数据
  const displayData = useMemo(() => {
    return buildProjectReimbursementDisplayData(allData, timeFilter);
  }, [allData, timeFilter]);

  // 辅助函数：根据报销单的状态（pending/approved/rejected）返回不同颜色和样式的标签
  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded text-xs font-medium">待审批</span>;
      case 'approved': return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-xs font-medium">已通过</span>;
      case 'rejected': return <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium">已驳回</span>;
      default: return null;
    }
  };

  // 骨架屏组件
  const renderSkeleton = () => (
    <div className="space-y-4 p-4">
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse"></div>
      <div className="h-48 bg-gray-200 rounded-2xl animate-pulse"></div>
      <div className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
    </div>
  );

  // 过滤记录 (在时间过滤的基础上，再进行搜索和状态过滤)
  const filteredRecords = displayData?.recentRecords.filter(record => {
    const matchesSearch = record.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (record.reason && record.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* 顶部标题栏 */}
      <div className="bg-white px-4 py-3 flex items-center sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        {/* 显示当前项目名称，如果 URL 中没有则显示默认文字 */}
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 pr-4">
          {decodeURIComponent(projectName || '项目报销详情')}
        </h1>
      </div>

      {/* 如果正在加载显示骨架屏，否则如果 displayData 存在则渲染实际内容 */}
      {loading ? renderSkeleton() : displayData && (
        <>
          {/* 顶部汇总数据卡片 */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md">
              <div className="flex justify-between items-center mb-1">
                <div className="text-emerald-100 text-sm">
                  {timeFilter === 'month' ? '本月' : timeFilter === 'quarter' ? '本季' : timeFilter === 'year' ? '本年' : '全部'}累计报销 (元)
                </div>
                <div className="flex bg-white/20 p-0.5 rounded-lg">
                  <button onClick={() => setTimeFilter('month')} className={cn("px-2 py-1 text-[10px] rounded transition-colors", timeFilter === 'month' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本月</button>
                  <button onClick={() => setTimeFilter('quarter')} className={cn("px-2 py-1 text-[10px] rounded transition-colors", timeFilter === 'quarter' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本季</button>
                  <button onClick={() => setTimeFilter('year')} className={cn("px-2 py-1 text-[10px] rounded transition-colors", timeFilter === 'year' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>本年</button>
                  <button onClick={() => setTimeFilter('all')} className={cn("px-2 py-1 text-[10px] rounded transition-colors", timeFilter === 'all' ? "bg-white text-emerald-700 font-bold" : "text-emerald-50")}>全部</button>
                </div>
              </div>
              <div className="text-3xl font-bold mb-4">¥ {displayData.summary.totalAmount}</div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                <div>
                  <div className="text-emerald-100 text-xs mb-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> 待审批
                  </div>
                  <div className="text-lg font-bold">¥ {displayData.summary.pendingAmount}</div>
                </div>
                <div>
                  <div className="text-emerald-100 text-xs mb-1 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" /> 已通过
                  </div>
                  <div className="text-lg font-bold">¥ {displayData.summary.approvedAmount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 选项卡切换区域 (Tabs) */}
          <div className="px-4 mb-4">
            <div className="flex bg-gray-100/80 p-1 rounded-xl">
              {/* 点击时将 activeTab 状态设置为 'overview' */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center ${
                  activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PieChart className="w-4 h-4 mr-2" />
                分类统计
              </button>
              {/* 点击时将 activeTab 状态设置为 'records' */}
              <button
                onClick={() => setActiveTab('records')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center ${
                  activeTab === 'records' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                报销明细
              </button>
            </div>
          </div>

          {/* 选项卡对应的内容区域 */}
          <div className="px-4">
            {/* 条件渲染：如果 activeTab 是 'overview'，显示分类统计图表 */}
            {activeTab === 'overview' ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }} // 动画：从左侧滑入
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <PieChart className="w-4 h-4 text-blue-500 mr-2" />
                  各项支出占比
                </h3>
                <div className="space-y-4">
                  {/* 遍历分类数据并渲染进度条 */}
                  {displayData.categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无分类数据</div>
                  ) : displayData.categories.map((cat, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{cat.name}</span>
                        <span className="font-bold text-gray-900">¥ {cat.amount}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-blue-500 rounded-full" 
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{cat.percentLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* 条件渲染：如果 activeTab 是 'records'，显示报销明细列表 */
              <motion.div
                initial={{ opacity: 0, x: 10 }} // 动画：从右侧滑入
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                {/* 搜索和过滤栏 */}
                <div className="flex space-x-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索申请人、类别、事由..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none shadow-sm"
                  >
                    <option value="all">全部状态</option>
                    <option value="pending">待审批</option>
                    <option value="approved">已通过</option>
                    <option value="rejected">已驳回</option>
                  </select>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>暂无匹配的报销记录</p>
                  </div>
                ) : (
                  /* 遍历最近的报销记录并渲染卡片 */
                  filteredRecords.map((record) => (
                    <div 
                      key={record.id} 
                      onClick={() => setSelectedRecord(record)}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{record.category}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                              <Calendar className="w-3 h-3 mr-1" />
                              {record.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="font-bold text-gray-900 mb-1">¥ {record.amount}</div>
                          {/* 调用前面定义的函数获取状态标签 */}
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          申请人：{record.applicant}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* 报销详情弹窗 */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto flex flex-col"
            >
              <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 flex justify-between items-center z-10 rounded-t-3xl sm:rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-900">报销详情</h3>
                <button onClick={() => setSelectedRecord(null)} className="p-1 bg-gray-100 text-gray-500 rounded-full active:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                      {selectedRecord.applicant ? selectedRecord.applicant[0] : '我'}
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">
                        {selectedRecord.applicant || '我'}
                      </div>
                      <div className="text-sm text-gray-500">{selectedRecord.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">¥{selectedRecord.amount}</div>
                    <div className="mt-1 flex justify-end">
                      {getStatusBadge(selectedRecord.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">费用类型</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedRecord.category}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">事由明细</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                      {selectedRecord.reason || '无详细事由'}
                    </div>
                  </div>

                  {selectedRecord.images && selectedRecord.images.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-2">凭证附件 ({selectedRecord.images.length}张)</div>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedRecord.images.map((img: string, idx: number) => (
                          <div key={idx} className="aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                            <img src={img} alt="凭证" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
