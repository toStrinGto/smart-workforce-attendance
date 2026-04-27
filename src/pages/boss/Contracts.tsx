/**
 * Contracts.tsx
 * 老板 (Boss) 角色的合同管理页面。
 * 提供合同列表查看、新增、编辑、删除以及按状态/项目搜索过滤的功能，支持查看合同详细信息和附件。
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Trash2, Edit, Eye, X, Building2, Calendar, DollarSign, Briefcase, AlertCircle, Search, Filter } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Contract {
  id: string;
  name: string;
  party: string;
  amount: number;
  date: string;
  status: 'active' | 'completed' | 'terminated';
  content: string;
}

interface ContractData {
  income: Contract[];
  expense: Contract[];
}

export default function Contracts() {
  usePageTitle('合同管理');
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'expense' ? 'expense' : 'income';

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'terminated'>('all');
  
  const [data, setData] = useState<ContractData>({ income: [], expense: [] });
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedContract, setSelectedContract] = useState<(Contract & { type?: 'income' | 'expense' }) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Contract> & { type?: 'income' | 'expense' }>({});

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await request('/api/v1/contracts');
      if (res.code === 200) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', contract?: Contract & { type?: 'income' | 'expense' }) => {
    setModalMode(mode);
    if (contract) {
      setSelectedContract(contract);
      setFormData({ ...contract, type: contract.type });
    } else {
      setSelectedContract(null);
      setFormData({
        type: typeFilter === 'all' ? 'income' : typeFilter,
        name: '',
        party: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        content: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedContract(null);
      setFormData({});
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetType = formData.type || 'income';
      if (modalMode === 'add') {
        const newContract = { ...formData } as Contract;
        delete (newContract as any).type;
        
        const res = await request<Contract>('/api/v1/contracts', {
          method: 'POST',
          body: JSON.stringify({ type: targetType, contract: newContract })
        });
        const createdContract = res.data || newContract;
        setData(prev => ({
          ...prev,
          [targetType]: [createdContract, ...prev[targetType]]
        }));
      } else if (modalMode === 'edit' && selectedContract) {
        const originalType = selectedContract.type || 'income';
        const updatedContract = { ...formData } as Contract;
        delete (updatedContract as any).type;
        
        const res = await request<Contract>(`/api/v1/contracts/${selectedContract.id}`, {
          method: 'PUT',
          body: JSON.stringify({ type: targetType, contract: updatedContract })
        });
        const savedContract = res.data || { ...updatedContract, id: selectedContract.id };
        
        setData(prev => {
          const newData = { ...prev };
          if (originalType === targetType) {
            newData[targetType] = newData[targetType].map(c => c.id === selectedContract.id ? savedContract : c);
          } else {
            newData[originalType] = newData[originalType].filter(c => c.id !== selectedContract.id);
            newData[targetType] = [savedContract, ...newData[targetType]];
          }
          return newData;
        });
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
      await request(`/api/v1/contracts/${deleteConfirmId}`, { method: 'DELETE' });
      setData(prev => ({
        income: prev.income.filter(c => c.id !== deleteConfirmId),
        expense: prev.expense.filter(c => c.id !== deleteConfirmId)
      }));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getFilteredContracts = () => {
    let list: (Contract & { type: 'income' | 'expense' })[] = [];
    if (typeFilter === 'all' || typeFilter === 'income') {
      list = [...list, ...data.income.map(c => ({ ...c, type: 'income' as const }))];
    }
    if (typeFilter === 'all' || typeFilter === 'expense') {
      list = [...list, ...data.expense.map(c => ({ ...c, type: 'expense' as const }))];
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return list.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.party.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const filteredContracts = getFilteredContracts();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">合同管理</h1>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full active:bg-blue-100 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white px-4 border-b border-gray-100 sticky top-14 z-10">
        <div className="flex space-x-6">
          {(['all', 'income', 'expense'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={cn(
                "py-3 text-sm font-medium relative transition-colors",
                typeFilter === tab ? "text-blue-600" : "text-gray-500"
              )}
            >
              {tab === 'all' ? '全部合同' : tab === 'income' ? '收入合同' : '支出合同'}
              {typeFilter === tab && (
                <motion.div layoutId="contractTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <div className="py-3 flex space-x-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索合同名称或相对方..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="all">全部状态</option>
            <option value="active">执行中</option>
            <option value="completed">已完成</option>
            <option value="terminated">已终止</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? renderSkeleton() : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredContracts.map((contract) => (
                <motion.div
                  key={contract.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenModal('view', contract)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center space-x-2 mb-1">
                        {typeFilter === 'all' && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap",
                            contract.type === 'income' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {contract.type === 'income' ? '收入' : '支出'}
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 line-clamp-1">{contract.name}</h3>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5",
                      contract.status === 'active' ? "bg-green-50 text-green-600" :
                      contract.status === 'completed' ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-600"
                    )}>
                      {contract.status === 'active' ? '执行中' : contract.status === 'completed' ? '已完成' : '已终止'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="line-clamp-1">{contract.party}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium text-gray-900">{formatCurrency(contract.amount)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{contract.date}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', contract); }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(contract.id, e)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredContracts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无符合条件的合同</p>
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
                  {modalMode === 'add' ? '新增合同' : modalMode === 'edit' ? '编辑合同' : '合同详情'}
                </h2>
                <button onClick={handleCloseModal} className="p-2 bg-gray-100 rounded-full text-gray-500 active:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {modalMode === 'view' && selectedContract ? (
                  <div className="space-y-6 pb-6">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {selectedContract.type && (
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-bold",
                            selectedContract.type === 'income' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {selectedContract.type === 'income' ? '收入合同' : '支出合同'}
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-gray-900">{selectedContract.name}</h3>
                      </div>
                      <div className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        {selectedContract.id}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">相对方</div>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedContract.party}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">合同金额</div>
                        <div className="font-bold text-gray-900 text-lg text-orange-600 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {formatCurrency(selectedContract.amount).replace('¥', '')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">签订日期</div>
                          <div className="font-medium text-gray-900 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedContract.date}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">状态</div>
                          <div className="font-medium text-gray-900">
                            {selectedContract.status === 'active' ? '执行中' : selectedContract.status === 'completed' ? '已完成' : '已终止'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                        <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
                        合同内容摘要
                      </h4>
                      <div className="bg-white border border-gray-100 rounded-xl p-4 text-gray-700 text-sm leading-relaxed shadow-sm">
                        {selectedContract.content || '暂无内容摘要'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form id="contractForm" onSubmit={handleSubmit} className="space-y-4 pb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">合同类型</label>
                      <select
                        value={formData.type || 'income'}
                        onChange={e => setFormData({...formData, type: e.target.value as 'income' | 'expense'})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                      >
                        <option value="income">收入合同</option>
                        <option value="expense">支出合同</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">合同名称</label>
                      <input
                        required
                        type="text"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        placeholder="请输入合同名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">相对方 (甲方/乙方)</label>
                      <input
                        required
                        type="text"
                        value={formData.party || ''}
                        onChange={e => setFormData({...formData, party: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        placeholder="请输入公司名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">合同金额 (元)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount !== undefined ? formData.amount : ''}
                        onChange={e => setFormData({...formData, amount: e.target.value ? parseFloat(e.target.value) : 0})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">签订日期</label>
                        <input
                          required
                          type="date"
                          value={formData.date || ''}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                        <select
                          value={formData.status || 'active'}
                          onChange={e => setFormData({...formData, status: e.target.value as Contract['status']})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        >
                          <option value="active">执行中</option>
                          <option value="completed">已完成</option>
                          <option value="terminated">已终止</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">内容摘要</label>
                      <textarea
                        rows={4}
                        value={formData.content || ''}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
                        placeholder="请输入合同主要内容..."
                      />
                    </div>
                  </form>
                )}
              </div>

              {modalMode !== 'view' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <button
                    type="submit"
                    form="contractForm"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center"
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除合同？</h3>
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
