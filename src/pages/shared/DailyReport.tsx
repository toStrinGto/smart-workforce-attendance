/**
 * DailyReport.tsx
 * 共享页面：施工日志/施工日报。
 * 允许工头 (Foreman) 或其他有权限的角色填写和提交每日的施工日志，包括施工内容、进度、人员情况及现场照片。
 * 同时也支持查看历史日志记录。
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Clock, LayoutTemplate, Plus, Image as ImageIcon, CheckCircle2, Send, X, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { request, uploadFiles } from '@/lib/api';
import { extractList } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
interface ReportImage {
  file: File;
  previewUrl: string;
}

type DailyReportTemplateOwner = {
  id: number;
  name: string;
};

type DailyReportTemplate = {
  id: number;
  name: string;
  content: string;
  visibility: 'system' | 'personal';
  owner: DailyReportTemplateOwner | null;
  editable: boolean;
  deletable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

interface DailyReportHistoryItem {
  id: number;
  date: string;
  summary: string;
  content?: string;
  status: string;
  boss?: string;
  reviewer?: string;
  images?: string[];
  templateName?: string;
}

function isReviewedStatus(status?: string) {
  return status === '已阅' || status === 'reviewed';
}

function getReportStatusLabel(status?: string) {
  return isReviewedStatus(status) ? '已阅' : '未阅';
}

const LEGACY_WORKER_TEMPLATE_STORAGE_PREFIX = 'daily-report-worker-templates';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeTemplateOwner(raw: unknown): DailyReportTemplateOwner | null {
  if (!isObjectRecord(raw)) return null;
  const id = Number(raw.id);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!Number.isFinite(id) || !name) return null;
  return { id, name };
}

function normalizeDailyReportTemplate(raw: unknown): DailyReportTemplate | null {
  if (!isObjectRecord(raw)) return null;
  const id = Number(raw.id);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const content = typeof raw.content === 'string' ? raw.content : '';
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    content,
    visibility: raw.visibility === 'personal' ? 'personal' : 'system',
    owner: normalizeTemplateOwner(raw.owner),
    editable: Boolean(raw.editable),
    deletable: Boolean(raw.deletable),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

function normalizeDailyReportTemplates(raw: unknown): DailyReportTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeDailyReportTemplate(item))
    .filter((item): item is DailyReportTemplate => Boolean(item));
}

export default function DailyReport() {
  usePageTitle('施工日报');
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'write' | 'history' | 'templates'>('write');
  
  // Data State
  const [templates, setTemplates] = useState<DailyReportTemplate[]>([]);
  const [history, setHistory] = useState<DailyReportHistoryItem[]>([]);
  
  // Loading State
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
  const [reviewingHistoryId, setReviewingHistoryId] = useState<number | null>(null);

  // Write Form State
  const [selectedTemplate, setSelectedTemplate] = useState<DailyReportTemplate | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [images, setImages] = useState<ReportImage[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [templateActionError, setTemplateActionError] = useState('');
  const [historyActionError, setHistoryActionError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyReportTemplate | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempContent, setTempContent] = useState('');
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<DailyReportHistoryItem | null>(null);

  const applyTemplates = (nextTemplates: DailyReportTemplate[], preferredTemplateId?: number | null) => {
    setTemplates(nextTemplates);
    const preferredId = preferredTemplateId ?? selectedTemplate?.id ?? null;
    const nextSelectedTemplate =
      (preferredId !== null ? nextTemplates.find((template) => template.id === preferredId) : null) ||
      nextTemplates[0] ||
      null;

    setSelectedTemplate(nextSelectedTemplate);
    setReportContent(nextSelectedTemplate?.content || '');
  };

  const clearLegacyWorkerTemplates = () => {
    if (typeof window === 'undefined') return;
    if (currentUser?.role !== 'worker' || currentUser?.id == null) return;
    window.localStorage.removeItem(`${LEGACY_WORKER_TEMPLATE_STORAGE_PREFIX}:${currentUser.id}`);
  };

  const refreshTemplates = async (preferredTemplateId?: number | null) => {
    const json = await request('/api/v1/reports/templates');
    const nextTemplates = normalizeDailyReportTemplates(extractList(json.data));
    applyTemplates(nextTemplates, preferredTemplateId);
    clearLegacyWorkerTemplates();
    return nextTemplates;
  };

  const getTemplateScopeLabel = (template: DailyReportTemplate) => {
    if (template.visibility === 'system') return '系统模板';
    if (template.owner?.id === currentUser?.id) return '我的模板';
    return null;
  };

  // Fetch Data on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const json = await request('/api/v1/reports/templates');
        applyTemplates(normalizeDailyReportTemplates(extractList(json.data)), null);
        clearLegacyWorkerTemplates();
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }

      try {
        const json = await request('/api/v1/reports/history');
        setHistory(extractList(json.data));
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    const timer = window.setTimeout(fetchInitialData, 600);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id, currentUser?.role]);

  const handleTemplateChange = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setReportContent(template.content);
    }
  };

  const openModal = (template?: DailyReportTemplate) => {
    setTemplateActionError('');
    if (template) {
      setEditingTemplate(template);
      setTempName(template.name);
      setTempContent(template.content);
    } else {
      setEditingTemplate(null);
      setTempName('');
      setTempContent('');
    }
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!tempName.trim() || !tempContent.trim() || savingTemplate) return;

    setSavingTemplate(true);
    setTemplateActionError('');
    
    try {
      let preferredTemplateId = editingTemplate?.id ?? null;
      if (editingTemplate) {
        const res = await request<DailyReportTemplate>(`/api/v1/reports/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: tempName, content: tempContent })
        });
        preferredTemplateId = res.data?.id ?? editingTemplate.id;
      } else {
        const res = await request<DailyReportTemplate>('/api/v1/reports/templates', {
          method: 'POST',
          body: JSON.stringify({ name: tempName, content: tempContent })
        });
        preferredTemplateId = res.data?.id ?? null;
      }
      await refreshTemplates(preferredTemplateId);
      setIsModalOpen(false);
      
      // Show save success toast
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setTemplateActionError(err instanceof Error ? err.message : '模板保存失败，请稍后重试');
      try {
        await refreshTemplates(editingTemplate?.id ?? null);
      } catch (refreshErr) {
        console.error('Failed to refresh templates after save error:', refreshErr);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: DailyReportTemplate) => {
    if (deletingTemplateId) return;
    if (!window.confirm(`确定删除模板“${template.name}”吗？`)) return;

    setDeletingTemplateId(template.id);
    setTemplateActionError('');

    try {
      await request(`/api/v1/reports/templates/${template.id}`, {
        method: 'DELETE',
      });
      await refreshTemplates(selectedTemplate?.id === template.id ? null : selectedTemplate?.id ?? null);

      if (editingTemplate?.id === template.id) {
        setIsModalOpen(false);
        setEditingTemplate(null);
        setTempName('');
        setTempContent('');
      }
    } catch (err) {
      console.error(err);
      setTemplateActionError(err instanceof Error ? err.message : '模板删除失败，请稍后重试');
      try {
        await refreshTemplates(selectedTemplate?.id ?? null);
      } catch (refreshErr) {
        console.error('Failed to refresh templates after delete error:', refreshErr);
      }
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const openHistoryDetail = (report: DailyReportHistoryItem) => {
    setHistoryActionError('');
    setSelectedHistoryReport(report);
  };

  const closeHistoryDetail = async () => {
    if (!selectedHistoryReport) return;
    if (reviewingHistoryId) return;

    if (isReviewedStatus(selectedHistoryReport.status)) {
      setHistoryActionError('');
      setSelectedHistoryReport(null);
      return;
    }

    setReviewingHistoryId(selectedHistoryReport.id);
    setHistoryActionError('');

    try {
      const res = await request<DailyReportHistoryItem>(`/api/v1/reports/${selectedHistoryReport.id}/review`, {
        method: 'PUT',
      });

      const nextReport: DailyReportHistoryItem = {
        ...selectedHistoryReport,
        ...(res.data || {}),
        status: res.data?.status || 'reviewed',
        boss: res.data?.boss || selectedHistoryReport.boss || '王老板',
      };

      setHistory((prev) =>
        prev.map((item) => (item.id === nextReport.id ? nextReport : item)),
      );
      setSelectedHistoryReport(null);
    } catch (err) {
      console.error(err);
      setHistoryActionError(err instanceof Error ? err.message : '更新已阅状态失败，请稍后重试');
    } finally {
      setReviewingHistoryId(null);
    }
  };

  const handleSubmit = async () => {
    if (!reportContent.trim() || submittingReport) return;
    
    setSubmittingReport(true);
    setSubmitError('');
    
    try {
      const uploadedImages = await uploadFiles(images.map(img => img.file), 'daily-report');
      const reportPayload: Record<string, unknown> = {
        content: reportContent,
        images: uploadedImages.map(file => file.url),
      };
      if (selectedTemplate?.id) {
        reportPayload.templateId = selectedTemplate.id;
      }
      const res = await request<any>('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify(reportPayload)
      });
      
      const newRecord = res.data || {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        summary: reportContent.substring(0, 20) + '...',
        status: 'submitted',
        boss: '王总'
      };
      setHistory(prev => [newRecord, ...prev]);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setActiveTab('history');
        if (selectedTemplate) {
          setReportContent(selectedTemplate.content);
        } else {
          setReportContent('');
        }
        clearImages();
      }, 1500);
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : '发送失败，请稍后重试');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="返回" className="p-1 -ml-1 text-gray-600 active:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">施工日报</h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 border-b border-gray-100 flex space-x-6">
        {[
          { id: 'write', name: '写日报', icon: FileText },
          { id: 'history', name: '历史记录', icon: Clock },
          { id: 'templates', name: '模板管理', icon: LayoutTemplate },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-3 flex items-center space-x-1.5 border-b-2 transition-colors",
                isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-bold">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Write Tab */}
        {activeTab === 'write' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Template Selector */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <label className="text-xs font-bold text-gray-500 mb-2 block">快速选择模板</label>
              <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-1 w-full">
                {loadingTemplates ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse flex-shrink-0"></div>
                  ))
                ) : templates.length === 0 ? (
                  <span className="text-xs text-gray-400">暂无模板，请前往模板管理添加</span>
                ) : (
                  templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateChange(t.id)}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-shrink-0",
                        selectedTemplate?.id === t.id 
                          ? "bg-orange-50 border-orange-200 text-orange-600" 
                          : "bg-white border-gray-200 text-gray-600"
                      )}
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[320px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-gray-800">汇报内容</label>
                <span className="text-xs text-gray-400">接收人: 老板</span>
              </div>
              <textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="flex-1 w-full min-h-[150px] resize-none outline-none text-sm text-gray-700 leading-relaxed"
                placeholder="请输入日报内容..."
              />
              
              {/* Image Preview Area */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden">
                      <img src={img.previewUrl} alt="日报图片预览" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(idx)}
                        aria-label="删除日报图片"
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= 9}
                    aria-label="添加日报图片"
                    className="flex items-center text-gray-500 active:text-orange-500 transition-colors disabled:opacity-50 disabled:active:text-gray-500"
                  >
                    <ImageIcon className="w-5 h-5 mr-1" />
                    <span className="text-xs font-medium">添加图片 {images.length > 0 && `(${images.length}/9)`}</span>
                  </button>
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
            </div>

            {/* Submit Button */}
            {submitError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {submitError}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!reportContent.trim() || submittingReport}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
            >
              {submittingReport ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              发送汇报
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loadingHistory ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 bg-gray-100 rounded w-24"></div>
                    <div className="h-5 bg-gray-100 rounded w-12"></div>
                  </div>
                  <div className="h-4 bg-gray-50 rounded w-full mb-1"></div>
                  <div className="h-4 bg-gray-50 rounded w-2/3 mb-3"></div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-gray-100 mr-1.5"></div>
                    <div className="h-3 bg-gray-100 rounded w-20"></div>
                  </div>
                </div>
              ))
            ) : history.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>暂无历史记录</p>
              </div>
            ) : (
              history.map(report => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => openHistoryDetail(report)}
                  className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-bold text-gray-800">{report.date} 日报</div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-md border",
                      isReviewedStatus(report.status) ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {getReportStatusLabel(report.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{report.summary}</p>
                  <div className="flex items-center text-xs text-gray-400">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-1.5">
                      {(report.boss || report.reviewer || '老板')[0]}
                    </div>
                    汇报给 {report.boss || report.reviewer || '老板'}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button 
              onClick={() => openModal()}
              className="w-full py-3 border-2 border-dashed border-orange-200 rounded-2xl text-orange-500 font-bold text-sm flex items-center justify-center bg-orange-50/50 active:bg-orange-50 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建日报模板
            </button>

            {templateActionError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {templateActionError}
              </div>
            )}
            
            {loadingTemplates ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex justify-between items-center mb-2">
                    <div className="h-4 bg-gray-100 rounded w-24"></div>
                    <div className="h-3 bg-gray-100 rounded w-8"></div>
                  </div>
                  <div className="h-20 bg-gray-50 rounded-xl border border-gray-100"></div>
                </div>
              ))
            ) : (
              templates.map(template => (
                <div key={template.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-800">{template.name}</h3>
                      {getTemplateScopeLabel(template) && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                          {getTemplateScopeLabel(template)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {template.editable && (
                        <button 
                          onClick={() => openModal(template)}
                          className="text-xs text-blue-500 font-medium active:opacity-70"
                        >
                          编辑
                        </button>
                      )}
                      {template.deletable && (
                        <button
                          type="button"
                          aria-label={`删除模板 ${template.name}`}
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={deletingTemplateId === template.id}
                          className="text-xs text-red-500 font-medium active:opacity-70 disabled:opacity-50"
                        >
                          {deletingTemplateId === template.id ? '删除中' : '删除'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed border border-gray-100">
                    {template.content}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistoryReport && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedHistoryReport.date} 日报</h3>
                  <p className="text-xs text-gray-400 mt-1">汇报给 {selectedHistoryReport.boss || selectedHistoryReport.reviewer || '老板'}</p>
                </div>
                <button
                  onClick={closeHistoryDetail}
                  aria-label="关闭日报详情"
                  disabled={reviewingHistoryId === selectedHistoryReport.id}
                  className="text-gray-400 active:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">状态</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-md border",
                    isReviewedStatus(selectedHistoryReport.status)
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {getReportStatusLabel(selectedHistoryReport.status)}
                  </span>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 mb-2">汇报内容</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedHistoryReport.content || selectedHistoryReport.summary || '暂无详情内容'}
                  </div>
                </div>

                {selectedHistoryReport.images && selectedHistoryReport.images.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-2">现场图片</div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedHistoryReport.images.map((image, index) => (
                        <img
                          key={`${selectedHistoryReport.id}-${index}`}
                          src={image}
                          alt={`日报图片 ${index + 1}`}
                          className="w-full aspect-square rounded-xl object-cover border border-gray-100"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {historyActionError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {historyActionError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={closeHistoryDetail}
                  disabled={reviewingHistoryId === selectedHistoryReport.id}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold active:bg-orange-600 transition-colors disabled:opacity-50 disabled:active:bg-orange-500 flex items-center justify-center"
                >
                  {reviewingHistoryId === selectedHistoryReport.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      标记已阅中...
                    </>
                  ) : (
                    '关闭'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  {editingTemplate ? '编辑模板' : '新建模板'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} aria-label="关闭模板弹窗" className="text-gray-400 active:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">模板名称</label>
                  <input 
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500"
                    placeholder="例如：通用施工日报"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">模板内容</label>
                  <textarea 
                    value={tempContent}
                    onChange={e => setTempContent(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 h-32 resize-none"
                    placeholder="请输入模板内容..."
                  />
                </div>
                {templateActionError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {templateActionError}
                  </div>
                )}
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!tempName.trim() || !tempContent.trim() || savingTemplate}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold active:bg-orange-600 transition-colors disabled:opacity-50 disabled:active:bg-orange-500 flex items-center justify-center"
                >
                  {savingTemplate ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存'}
                </button>
                {editingTemplate && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(editingTemplate)}
                    disabled={deletingTemplateId === editingTemplate.id}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 active:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingTemplateId === editingTemplate.id ? '删除中...' : '删除当前模板'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            <span className="text-sm font-medium">发送成功！</span>
          </motion.div>
        )}
        {showSaveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 z-[110]"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">保存成功！</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
