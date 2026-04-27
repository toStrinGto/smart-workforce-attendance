/**
 * Reimbursement.tsx
 * 共享页面：报销申请与审批。
 * 允许用户（如工头）提交报销单（包括金额、类别、事由和凭证图片）。
 * 对于老板 (Boss) 角色，此页面还提供审批功能，可对下属提交的报销单进行“通过”或“驳回”操作。
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Receipt, Clock, Image as ImageIcon, CheckCircle2, Send, Wallet, FileText, Plus, Camera, X, Check, XCircle, Loader2, Search, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { request, uploadFiles } from '@/lib/api';
import { extractList } from '@/lib/utils';

// Mock Data
const EXPENSE_TYPES = ['交通费', '餐饮费', '住宿费', '材料费', '办公费', '其他'];

interface ReceiptImage {
  file: File;
  previewUrl: string;
}

function getStatusClass(status: string) {
  switch (status) {
    case 'paid':
    case 'approved':
    case '已打款':
    case '已通过':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'pending':
    case '审批中':
    case '待审批':
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'rejected':
    case '已驳回':
      return 'text-red-600 bg-red-50 border-red-100';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-100';
  }
}

function getStatusKey(status: string) {
  switch (status) {
    case 'paid':
    case '已打款':
      return 'paid';
    case 'approved':
    case '已通过':
      return 'approved';
    case 'pending':
    case '审批中':
    case '待审批':
      return 'pending';
    case 'rejected':
    case '已驳回':
      return 'rejected';
    default:
      return status;
  }
}

function getStatusLabel(status: string) {
  switch (getStatusKey(status)) {
    case 'paid':
      return '已打款';
    case 'approved':
      return '已通过';
    case 'pending':
      return '审批中';
    case 'rejected':
      return '已驳回';
    default:
      return status;
  }
}

export default function Reimbursement() {
  usePageTitle('费用报销');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useAppStore();
  const [activeTab, setActiveTab] = useState<'apply' | 'approve' | 'history'>('apply');
  
  // Data State
  const [approvals, setApprovals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState({ pendingAmount: 0, reimbursedAmount: 0 });
  
  // Loading State
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [approvalError, setApprovalError] = useState('');

  // History State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Fetch Data
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    } else if (tab === 'approve' && role === 'boss') {
      setActiveTab('approve');
    } else if (tab === 'apply') {
      setActiveTab('apply');
    }
  }, [role, searchParams]);

  useEffect(() => {
    if (role === 'boss') {
      const fetchApprovals = async () => {
        setLoadingApprovals(true);
        try {
          const json = await request('/api/v1/reimbursements/pending');
          setApprovals(extractList(json.data));
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingApprovals(false);
        }
      };
      setTimeout(fetchApprovals, 600);
    }
  }, [role]);

  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const json = await request('/api/v1/reimbursements/history');
          setHistory(json.data.history);
          setHistorySummary(json.data.summary);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingHistory(false);
        }
      };
      setTimeout(fetchHistory, 600);
    }
  }, [activeTab]);

  const handleApprove = async (id: number, approved: boolean) => {
    if (approvingId) return;
    setApprovingId(id);
    setApprovalMessage('');
    setApprovalError('');
    try {
      await request(`/api/v1/reimbursements/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(approved ? { approved } : { approved, reason: '老板审批驳回' })
      });
      setApprovals(prev => prev.filter(a => a.id !== id));
      setApprovalMessage(approved ? '已审批通过，后端状态已更新' : '已驳回，后端状态已更新');
      setTimeout(() => setApprovalMessage(''), 2200);
    } catch (err) {
      console.error('Approval failed:', err);
      setApprovalError(err instanceof Error ? err.message : '审批失败，请稍后重试');
    } finally {
      setApprovingId(null);
    }
  };

  const tabs = role === 'boss' ? [
    { id: 'apply', name: '申请报销', icon: Receipt },
    { id: 'approve', name: '审批报销', icon: CheckCircle2 },
    { id: 'history', name: '报销记录', icon: Clock },
  ] : [
    { id: 'apply', name: '申请报销', icon: Receipt },
    { id: 'history', name: '报销记录', icon: Clock },
  ];

  // Apply Form State
  const [selectedType, setSelectedType] = useState(EXPENSE_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [images, setImages] = useState<ReceiptImage[]>([]);
  const [submitError, setSubmitError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [reason]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files as FileList);
      const newImages = newFiles.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
      setImages(prev => {
        const slots = Math.max(9 - prev.length, 0);
        const accepted = newImages.slice(0, slots);
        newImages.slice(slots).forEach(img => URL.revokeObjectURL(img.previewUrl));
        return [...prev, ...accepted];
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearImages = () => {
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  };

  const handleSubmit = async (keepApplying: boolean = false) => {
    if (!amount || !reason.trim() || submitting) return;
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      const uploadedImages = await uploadFiles(images.map(img => img.file), 'reimbursement');
      await request('/api/v1/reimbursements', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedType,
          amount: parseFloat(amount),
          reason,
          images: uploadedImages.map(file => file.url)
        })
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (!keepApplying) {
          setActiveTab('history');
        }
        setAmount('');
        setReason('');
        clearImages();
        setSelectedType(EXPENSE_TYPES[0]);
      }, 1500);
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = history.filter(record => {
    const matchesSearch = record.reason.toLowerCase().includes(historySearch.toLowerCase()) || 
                          record.type.toLowerCase().includes(historySearch.toLowerCase()) ||
                          (role === 'boss' && record.applicant && record.applicant.toLowerCase().includes(historySearch.toLowerCase()));
    const matchesStatus = historyStatusFilter === 'all' || getStatusKey(record.status) === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="返回" className="p-1 -ml-1 text-gray-600 active:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">费用报销</h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 border-b border-gray-100 flex space-x-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-3 flex items-center space-x-1.5 border-b-2 transition-colors whitespace-nowrap",
                isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-bold">{tab.name}</span>
              {tab.id === 'approve' && approvals.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {approvals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* Apply Tab */}
        {activeTab === 'apply' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Amount Input */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <label className="text-xs font-bold text-gray-500 mb-3 block">报销金额 (元)</label>
              <div className="flex items-center border-b-2 border-gray-100 focus-within:border-orange-500 transition-colors pb-2">
                <span className="text-3xl font-bold text-gray-800 mr-2">¥</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-3xl font-bold text-gray-800 outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Expense Type Selector */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <label className="text-xs font-bold text-gray-500 mb-3 block">费用类型</label>
              <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-1 w-full">
                {EXPENSE_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors border flex-shrink-0",
                      selectedType === type 
                        ? "bg-orange-50 border-orange-200 text-orange-600" 
                        : "bg-white border-gray-200 text-gray-600"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason & Details */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-3 block">费用明细及事由</label>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={handleReasonChange}
                className="w-full min-h-[96px] resize-none outline-none text-sm text-gray-700 leading-relaxed placeholder:text-gray-400 overflow-hidden"
                placeholder="请详细描述费用产生的具体事由（如：前往A项目部打车费）..."
                rows={4}
              />
            </div>

            {/* Receipt Upload */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-gray-500">上传票据/凭证</label>
                <span className="text-[10px] text-gray-400">{images.length}/9 张</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden">
                    <img src={img.previewUrl} alt="报销凭证预览" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      aria-label="删除凭证"
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 9 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="上传票据或凭证"
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">拍照/相册</span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Submit Buttons */}
            {submitError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {submitError}
              </div>
            )}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleSubmit(true)}
                disabled={!amount || !reason.trim() || submitting}
                className="flex-1 py-3.5 rounded-xl bg-orange-50 text-orange-600 font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:active:scale-100 border border-orange-200"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '再记一笔'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={!amount || !reason.trim() || submitting}
                className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                提交报销
              </button>
            </div>
          </div>
        )}

        {/* Approve Tab (Boss Only) */}
        {activeTab === 'approve' && role === 'boss' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {approvalMessage && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {approvalMessage}
              </div>
            )}
            {approvalError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {approvalError}
              </div>
            )}
            {loadingApprovals ? (
              // Skeleton Loader for Approvals
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-24"></div>
                        <div className="h-3 bg-gray-100 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded w-16"></div>
                  </div>
                  <div className="h-10 bg-gray-50 rounded-xl border border-gray-100 mb-4"></div>
                  <div className="flex space-x-3">
                    <div className="flex-1 h-10 bg-gray-50 rounded-xl"></div>
                    <div className="flex-[2] h-10 bg-gray-100 rounded-xl"></div>
                  </div>
                </div>
              ))
            ) : approvals.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>暂无待审批报销</p>
              </div>
            ) : (
              approvals.map(approval => (
                <div key={approval.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {approval.applicant[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {approval.applicant} <span className="text-xs font-normal text-gray-500 ml-1">({approval.role})</span>
                        </div>
                        <div className="text-xs text-gray-400">{approval.date} · {approval.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">¥{approval.amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 border border-gray-100 mb-4">
                    <span className="text-gray-400 mr-1 text-xs">事由:</span>
                    {approval.reason}
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleApprove(approval.id, false)}
                      disabled={approvingId === approval.id}
                      className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center border border-red-100 active:bg-red-100 disabled:opacity-60 disabled:active:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      驳回
                    </button>
                    <button 
                      onClick={() => handleApprove(approval.id, true)}
                      aria-label="审批通过"
                      disabled={approvingId === approval.id}
                      className="flex-[2] py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shadow-sm active:bg-emerald-600 disabled:opacity-70 disabled:active:bg-emerald-500"
                    >
                      {approvingId === approval.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      {approvingId === approval.id ? '提交中' : '审批通过'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100">
                <div className="text-xs font-medium text-blue-600 mb-1">本月待审批</div>
                <div className="text-xl font-bold text-blue-800">
                  {loadingHistory ? <div className="h-7 w-20 bg-blue-200/50 animate-pulse rounded"></div> : `¥ ${historySummary.pendingAmount.toFixed(2)}`}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-100">
                <div className="text-xs font-medium text-emerald-600 mb-1">本月已报销</div>
                <div className="text-xl font-bold text-emerald-800">
                  {loadingHistory ? <div className="h-7 w-20 bg-emerald-200/50 animate-pulse rounded"></div> : `¥ ${historySummary.reimbursedAmount.toFixed(2)}`}
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex space-x-2 mb-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索事由、类型..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                />
              </div>
              <select
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none shadow-sm"
              >
                <option value="all">全部状态</option>
                <option value="pending">审批中</option>
                <option value="approved">已通过</option>
                <option value="paid">已打款</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>

            {/* History List */}
            <div className="space-y-3">
              {loadingHistory ? (
                // Skeleton Loader for History
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-20"></div>
                          <div className="h-3 bg-gray-100 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="h-5 bg-gray-100 rounded w-16"></div>
                        <div className="h-4 bg-gray-100 rounded w-12"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-50 rounded-xl border border-gray-100"></div>
                  </div>
                ))
              ) : filteredHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无匹配的报销记录</p>
                </div>
              ) : (
                filteredHistory.map(record => (
                <div 
                  key={record.id} 
                  onClick={() => setSelectedRecord(record)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                        <Wallet className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {record.type}
                          {role === 'boss' && <span className="ml-2 text-xs font-normal text-gray-500">({record.applicant})</span>}
                        </div>
                        <div className="text-xs text-gray-400">{record.date}</div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-base font-bold text-gray-800">¥{record.amount.toFixed(2)}</div>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-md border mt-1 inline-block", getStatusClass(record.status))}>
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl text-xs text-gray-600 border border-gray-100 flex justify-between items-center">
                    <div className="truncate pr-2">
                      <span className="text-gray-400 mr-1">事由:</span>
                      {record.reason}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              )))}
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 z-[110]"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">提交成功！</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Detail Modal */}
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
                <button onClick={() => setSelectedRecord(null)} aria-label="关闭报销详情" className="p-1 bg-gray-100 text-gray-500 rounded-full active:bg-gray-200">
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
                    <div className="text-2xl font-bold text-gray-900">¥{selectedRecord.amount.toFixed(2)}</div>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-md border mt-1 inline-block", getStatusClass(selectedRecord.status))}>
                      {getStatusLabel(selectedRecord.status)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">费用类型</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedRecord.type}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">事由明细</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                      {selectedRecord.reason}
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
