/**
 * IncomeSettlement.tsx
 * 老板 (Boss) 角色的收入结算管理页面。
 * 用于管理各个项目的收入结算单，支持创建、编辑、删除结算记录，并提供按项目、状态筛选和导出功能。
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Trash2, Edit, X, Building2, Calendar, DollarSign, Wallet, AlertCircle, Paperclip, Percent, Search, Download } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/api';
import { extractList } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface IncomeSettlement {
  id: string;
  payer: string;
  project: string;
  entryTime: string;
  billingPeriod: string;
  category: string;
  amount: number;
  taxRate: number;
  totalAmount: number;
  attachments: string[];
}

export default function IncomeSettlementPage() {
  usePageTitle('收入结算');
  const navigate = useNavigate();
  const [data, setData] = useState<IncomeSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedItem, setSelectedItem] = useState<IncomeSettlement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [downloadConfirmFile, setDownloadConfirmFile] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<IncomeSettlement>>({});
  const [attachmentInput, setAttachmentInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request('/api/v1/income-settlements');
      if (res.code === 200) {
        setData(extractList(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch income settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', item?: IncomeSettlement) => {
    setModalMode(mode);
    if (item) {
      setSelectedItem(item);
      setFormData(item);
      setAttachmentInput(item.attachments?.join(', ') || '');
    } else {
      setSelectedItem(null);
      setFormData({
        payer: '',
        project: '',
        entryTime: new Date().toISOString().split('T')[0],
        billingPeriod: '',
        category: '进度款',
        amount: 0,
        taxRate: 9,
        totalAmount: 0,
        attachments: []
      });
      setAttachmentInput('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedItem(null);
      setFormData({});
      setAttachmentInput('');
    }, 300);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Auto-calculate total amount when amount or taxRate changes
  useEffect(() => {
    if (modalMode !== 'view' && formData.amount !== undefined && formData.taxRate !== undefined) {
      const calculatedTotal = formData.amount * (1 + formData.taxRate / 100);
      setFormData(prev => ({ ...prev, totalAmount: Number(calculatedTotal.toFixed(2)) }));
    }
  }, [formData.amount, formData.taxRate, modalMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const attachmentsArray = attachmentInput.split(',').map(s => s.trim()).filter(Boolean);
      const payload = { ...formData, attachments: attachmentsArray } as IncomeSettlement;

      if (modalMode === 'add') {
        const res = await request<IncomeSettlement>('/api/v1/income-settlements', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setData(prev => [res.data || payload, ...prev]);
      } else if (modalMode === 'edit' && selectedItem) {
        const res = await request<IncomeSettlement>(`/api/v1/income-settlements/${selectedItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setData(prev => prev.map(item => item.id === selectedItem.id ? (res.data || { ...item, ...payload }) : item));
      }
      handleCloseModal();
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await request(`/api/v1/income-settlements/${deleteConfirmId}`, { method: 'DELETE' });
      setData(prev => prev.filter(item => item.id !== deleteConfirmId));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.payer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.project.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
            <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">收入结算</h1>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="w-8 h-8 flex items-center justify-center bg-teal-50 text-teal-600 rounded-full active:bg-teal-100 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[52px] z-10 flex space-x-2 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索打款方或项目..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
        >
          <option value="all">全部款项</option>
          <option value="进度款">进度款</option>
          <option value="结算款">结算款</option>
          <option value="预付款">预付款</option>
          <option value="质保金">质保金</option>
          <option value="其他">其他</option>
        </select>
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? renderSkeleton() : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredData.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenModal('view', item)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1 flex-1 pr-2">{item.payer}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-teal-50 text-teal-600">
                      {item.category}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="line-clamp-1">{item.project}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium text-gray-900">{formatCurrency(item.totalAmount)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{item.entryTime}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', item); }}
                      className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredData.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无收入结算数据</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl shadow-xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {modalMode === 'add' ? '新增收入结算' : modalMode === 'edit' ? '编辑收入结算' : '收入结算详情'}
                </h2>
                <button onClick={handleCloseModal} className="p-2 bg-gray-100 rounded-full text-gray-500 active:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {modalMode === 'view' && selectedItem ? (
                  <div className="space-y-6 pb-6">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-teal-100 text-teal-700">
                          {selectedItem.category}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{selectedItem.payer}</h3>
                      </div>
                      <div className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        {selectedItem.id}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">所属项目</div>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedItem.project}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">打入账户时间</div>
                          <div className="font-medium text-gray-900 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedItem.entryTime}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">账期时间</div>
                          <div className="font-medium text-gray-900">
                            {selectedItem.billingPeriod || '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50/50 rounded-xl p-4 space-y-4 border border-orange-100/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">金额 (不含税)</div>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(selectedItem.amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">税率</div>
                          <div className="font-medium text-gray-900">
                            {selectedItem.taxRate}%
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-orange-100">
                        <div className="text-xs text-gray-500 mb-1">金额总计 (含税)</div>
                        <div className="font-bold text-gray-900 text-xl text-orange-600 flex items-center">
                          <DollarSign className="w-5 h-5 mr-1" />
                          {formatCurrency(selectedItem.totalAmount).replace('¥', '')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                        <Paperclip className="w-4 h-4 mr-2 text-gray-500" />
                        附件
                      </h4>
                      {selectedItem.attachments && selectedItem.attachments.length > 0 ? (
                        <div className="space-y-2">
                          {selectedItem.attachments.map((att, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => setDownloadConfirmFile(att)}
                              className="w-full flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 active:bg-gray-100 transition-colors text-left"
                            >
                              <FileText className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">{att}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          暂无附件
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form id="settlementForm" onSubmit={handleSubmit} className="space-y-4 pb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">打款方</label>
                      <input
                        required
                        type="text"
                        value={formData.payer || ''}
                        onChange={e => setFormData({...formData, payer: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                        placeholder="请输入打款方名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">所属项目</label>
                      <input
                        required
                        type="text"
                        value={formData.project || ''}
                        onChange={e => setFormData({...formData, project: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                        placeholder="请输入项目名称"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">打入账户时间</label>
                        <input
                          required
                          type="date"
                          value={formData.entryTime || ''}
                          onChange={e => setFormData({...formData, entryTime: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">账期时间 (选填)</label>
                        <input
                          type="date"
                          value={formData.billingPeriod || ''}
                          onChange={e => setFormData({...formData, billingPeriod: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">收入类别</label>
                      <select
                        value={formData.category || '进度款'}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                      >
                        <option value="进度款">进度款</option>
                        <option value="结算款">结算款</option>
                        <option value="预付款">预付款</option>
                        <option value="质保金">质保金</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">金额 (不含税)</label>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.amount !== undefined ? formData.amount : ''}
                          onChange={e => setFormData({...formData, amount: e.target.value ? parseFloat(e.target.value) : 0})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">税率 (%)</label>
                        <div className="relative">
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.taxRate !== undefined ? formData.taxRate : ''}
                            onChange={e => setFormData({...formData, taxRate: e.target.value ? parseFloat(e.target.value) : 0})}
                            className="w-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                            placeholder="9"
                          />
                          <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">金额总计 (含税 - 自动计算)</label>
                      <input
                        readOnly
                        type="number"
                        value={formData.totalAmount || 0}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">附件上传</label>
                      <input
                        type="file"
                        multiple
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            const fileNames = Array.from(e.target.files).map((f: File) => f.name);
                            setAttachmentInput(fileNames.join(', '));
                          } else {
                            setAttachmentInput('');
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-600 hover:file:bg-teal-100"
                      />
                      {attachmentInput && (
                        <div className="mt-2 text-sm text-gray-500 break-words">
                          <span className="font-medium">已选附件:</span> {attachmentInput}
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {modalMode !== 'view' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <button
                    type="submit"
                    form="settlementForm"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl active:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '保存'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Download Confirmation Modal */}
      <AnimatePresence>
        {downloadConfirmFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadConfirmFile(null)}
              className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">下载附件</h3>
                <p className="text-gray-500 text-sm mb-6 break-all">确认要下载文件 "{downloadConfirmFile}" 吗？</p>
                <div className="flex space-x-3 w-full">
                  <button
                    onClick={() => setDownloadConfirmFile(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl active:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      // Mock download action
                      setDownloadConfirmFile(null);
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl active:bg-blue-700 transition-colors"
                  >
                    确认下载
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除收入结算？</h3>
                <p className="text-gray-500 text-sm mb-6">删除后将无法恢复，请确认是否继续操作。</p>
                <div className="flex space-x-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl active:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl active:bg-red-700 transition-colors"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
