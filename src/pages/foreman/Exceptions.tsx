/**
 * Exceptions.tsx
 * 工头 (Foreman) 角色的考勤异常处理页面。
 * 用于查看和处理工人的考勤异常情况（如迟到、早退、未打卡等），支持确认处理或驳回异常申诉。
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { useForemanExceptions } from '@/hooks/useForeman';
import { Exception } from '@/types/models';
import { List, ListItem } from '@/components/ui/List';
import { Button } from '@/components/ui/OldButton';
import { logger } from '@/lib/logger';

type TabType = 'pending' | 'handled' | 'rejected';

export default function ForemanExceptions() {
  usePageTitle('异常处理');
  const { exceptions, loading, processException, rejectException } = useForemanExceptions();
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isProcessing, setIsProcessing] = useState(false);

  // Controlled form state (string to allow clearing number inputs)
  const [formDayShift, setFormDayShift] = useState('1');
  const [formOvertime, setFormOvertime] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const openModal = (exception: Exception) => {
    setSelectedException(exception);
    setFormDayShift('1');
    setFormOvertime('0');
    setFormNotes('');
    setRejectReason('');
  };

  const handleProcess = async (id: number) => {
    try {
      setIsProcessing(true);
      await processException(id, { dayShift: parseFloat(formDayShift) || 0, overtimeHours: parseFloat(formOvertime) || 0, notes: formNotes });
      setSelectedException(null);
    } catch (error) {
      logger.error('Failed to process exception', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) return;
    try {
      setIsProcessing(true);
      await rejectException(id, { reason: rejectReason });
      setSelectedException(null);
    } catch (error) {
      logger.error('Failed to reject exception', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = exceptions.filter(e => e.status === 'pending').length;
  const handledCount = exceptions.filter(e => e.status === 'handled').length;
  const rejectedCount = exceptions.filter(e => e.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4 md:pb-0">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative md:pt-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-center text-gray-800 mb-4 md:text-2xl md:text-left">异常处理</h1>
          <div className="flex space-x-4 border-b border-gray-100">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'pending' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              待处理 ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('handled')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'handled' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              已处理 ({handledCount})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'rejected' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              已驳回 ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full md:py-6">
        <List>
          {activeTab === 'pending' && (
            <>
              {exceptions.filter(e => e.status === 'pending').map(exception => (
                <ListItem key={exception.id} className="justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mr-3 md:w-12 md:h-12 md:text-lg">
                      {exception.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800 md:text-base">{exception.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:text-sm">{exception.date} · {exception.reason}</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => openModal(exception)}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    处理
                  </Button>
                </ListItem>
              ))}
              {pendingCount === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无待处理异常</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'handled' && (
            <>
              {exceptions.filter(e => e.status === 'handled').map(exception => (
                <ListItem key={exception.id} className="justify-between opacity-70">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mr-3 md:w-12 md:h-12 md:text-lg">
                      {exception.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800 md:text-base">{exception.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:text-sm">{exception.date} · {exception.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-emerald-500 text-xs font-bold md:text-sm">
                    <CheckCircle2 className="w-4 h-4 mr-1 md:w-5 md:h-5" />
                    已解决
                  </div>
                </ListItem>
              ))}
              {handledCount === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无已处理异常</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'rejected' && (
            <>
              {exceptions.filter(e => e.status === 'rejected').map(exception => (
                <ListItem key={exception.id} className="justify-between opacity-70">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mr-3 md:w-12 md:h-12 md:text-lg">
                      {exception.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800 md:text-base">{exception.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:text-sm">{exception.date} · {exception.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-red-500 text-xs font-bold md:text-sm">
                    <XCircle className="w-4 h-4 mr-1 md:w-5 md:h-5" />
                    已驳回
                  </div>
                </ListItem>
              ))}
              {rejectedCount === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <XCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无已驳回异常</p>
                </div>
              )}
            </>
          )}
        </List>
      </div>

      {/* Process Modal */}
      <AnimatePresence>
        {selectedException && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedException(null)}
              className="fixed inset-0 bg-black/40 z-40 md:bg-black/20 md:backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 shadow-2xl md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:w-full md:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">处理异常</h3>
                <button onClick={() => setSelectedException(null)} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-start border border-gray-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-gray-800">{selectedException.name} - {selectedException.reason}</div>
                  <div className="text-xs text-gray-500 mt-1">日期: {selectedException.date}</div>
                </div>
              </div>

              {/* Process Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">补记白班 (个)</label>
                  <input
                    type="number"
                    min={0}
                    value={formDayShift}
                    onChange={(e) => setFormDayShift(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">补记加班 (小时)</label>
                  <input
                    type="number"
                    min={0}
                    value={formOvertime}
                    onChange={(e) => setFormOvertime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">处理备注</label>
                  <textarea
                    rows={2}
                    placeholder="请输入备注信息..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              <Button
                onClick={() => handleProcess(selectedException.id)}
                isLoading={isProcessing}
                className="w-full"
                size="lg"
              >
                确认处理
              </Button>

              {/* Reject Section */}
              <div className="border-t border-gray-100 mt-4 pt-4">
                <label className="block text-xs font-bold text-gray-700 mb-2">驳回原因</label>
                <textarea
                  rows={2}
                  placeholder="请输入驳回原因..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                />
                <Button
                  onClick={() => handleReject(selectedException.id)}
                  isLoading={isProcessing}
                  disabled={!rejectReason.trim()}
                  variant="outline"
                  className="w-full mt-3 !border-red-300 !text-red-600 hover:!bg-red-50"
                  size="lg"
                >
                  驳回
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
