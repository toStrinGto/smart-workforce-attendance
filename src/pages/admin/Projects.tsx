import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, X, Building2, Calendar, DollarSign, User, AlertCircle, TrendingUp } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { request } from '@/lib/api';
import { cn, extractList, getProjectStatusStyle, getProgressByStatus } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { AdminProject } from '@/types/models';

export default function AdminProjects() {
  usePageTitle('项目管理');
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminProject['status']>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<AdminProject>>({});

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await request('/api/v1/projects');
      if (res.code === 200) setProjects(extractList(res.data));
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', project?: AdminProject) => {
    setModalMode(mode);
    if (project) {
      setSelectedProject(project);
      setFormData({ ...project });
    } else {
      setSelectedProject(null);
      setFormData({
        name: '', manager: '',
        startDate: new Date().toISOString().split('T')[0],
        status: '未开工', budget: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => { setSelectedProject(null); setFormData({}); }, 200);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        const newProject = {
          name: formData.name || '', manager: formData.manager || '',
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          status: formData.status || '未开工',
          budget: formData.budget || 0,
        };
        const res = await request<AdminProject>('/api/v1/projects', { method: 'POST', body: JSON.stringify(newProject) });
        setProjects(prev => [res.data || ({ ...newProject, id: Date.now() } as AdminProject), ...prev]);
      } else if (modalMode === 'edit' && selectedProject) {
        const updatedProject = { ...selectedProject, ...formData } as AdminProject;
        const res = await request<AdminProject>(`/api/v1/projects/${selectedProject.id}`, { method: 'PUT', body: JSON.stringify(updatedProject) });
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? (res.data || updatedProject) : p));
      }
      handleCloseModal();
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/v1/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.manager.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    inProgress: projects.filter(p => p.status === '施工中').length,
    maintenance: projects.filter(p => p.status === '维保中').length,
    completed: projects.filter(p => p.status === '已完工').length,
  };

  const topProjects = projects
    .filter(p => p.status === '施工中')
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">项目管理</h2>
        <Button onClick={() => handleOpenModal('add')} size="sm">
          <Plus className="w-4 h-4" />
          新建项目
        </Button>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap gap-3 items-center bg-muted/30">
          <InputGroup className="w-56">
            <InputGroupAddon>
              <Search className="w-4 h-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索项目名称或负责人..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-8 px-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">全部状态</option>
            <option value="未开工">未开工</option>
            <option value="施工中">施工中</option>
            <option value="维保中">维保中</option>
            <option value="已完工">已完工</option>
          </select>
        </div>

        {/* Project Summary */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center uppercase tracking-wide">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            项目摘要
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-background rounded-lg p-3 border border-border">
              <div className="text-lg font-semibold text-foreground tabular-nums">{stats.inProgress}</div>
              <div className="text-[11px] text-muted-foreground">施工中</div>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <div className="text-lg font-semibold text-foreground tabular-nums">{stats.maintenance}</div>
              <div className="text-[11px] text-muted-foreground">维保中</div>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <div className="text-lg font-semibold text-foreground tabular-nums">{stats.completed}</div>
              <div className="text-[11px] text-muted-foreground">已完工</div>
            </div>
          </div>

          {topProjects.length > 0 && (
            <div>
              <h4 className="text-[11px] text-muted-foreground mb-1.5">重点项目（按预算排序）</h4>
              <div className="space-y-1.5">
                {topProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleOpenModal('view', project)}
                    className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border hover:border-foreground/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      <span className="text-sm text-foreground">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{project.manager}</span>
                      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${getProgressByStatus(project.status)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">暂无相关项目</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" aria-label="项目列表">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目名称</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目经理</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">开工日期</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">进度</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">预算</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => handleOpenModal('view', project)}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                      <td className="px-5 py-3 font-medium text-foreground">{project.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{project.manager}</td>
                      <td className="px-5 py-3 text-muted-foreground">{project.startDate}</td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getProjectStatusStyle(project.status))}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", project.status === '已完工' ? "bg-emerald-500/70" : "bg-primary/60")}
                              style={{ width: `${getProgressByStatus(project.status)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{getProgressByStatus(project.status)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground tabular-nums">{formatCurrency(project.budget)}</td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="xs" onClick={() => handleOpenModal('edit', project)}>
                          <Edit className="w-3.5 h-3.5" />
                          编辑
                        </Button>
                        <Button variant="ghost" size="xs" className="text-destructive" onClick={() => setDeleteConfirmId(project.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add/Edit/View Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'add' ? '新建项目' : modalMode === 'edit' ? '编辑项目' : '项目详情'}
            </DialogTitle>
            {modalMode === 'view' && selectedProject && (
              <DialogDescription>{selectedProject.name}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            {modalMode === 'view' && selectedProject ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getProjectStatusStyle(selectedProject.status))}>
                    {selectedProject.status}
                  </span>
                  <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[11px] font-mono rounded">
                    {selectedProject.id}
                  </span>
                </div>
                <div className="bg-muted/40 rounded-lg p-4 space-y-3 border border-border/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">项目经理</div>
                      <div className="text-sm text-foreground flex items-center">
                        <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {selectedProject.manager}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">开工日期</div>
                      <div className="text-sm text-foreground flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {selectedProject.startDate}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">项目预算</div>
                    <div className="text-lg font-semibold text-foreground flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                      {formatCurrency(selectedProject.budget).replace('¥', '')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">项目进度</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", selectedProject.status === '已完工' ? "bg-emerald-500/70" : "bg-primary/60")}
                          style={{ width: `${getProgressByStatus(selectedProject.status)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground tabular-nums">{getProgressByStatus(selectedProject.status)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form id="projectForm" onSubmit={handleSubmit} className="space-y-4 py-2">
                <div>
                  <label htmlFor="proj-name" className="block text-xs font-medium text-foreground mb-1.5">项目名称 <span className="text-destructive">*</span></label>
                  <Input id="proj-name" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="请输入项目名称" />
                </div>
                <div>
                  <label htmlFor="proj-manager" className="block text-xs font-medium text-foreground mb-1.5">项目经理 <span className="text-destructive">*</span></label>
                  <Input id="proj-manager" required value={formData.manager || ''} onChange={e => setFormData({ ...formData, manager: e.target.value })} placeholder="请输入项目经理姓名" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="proj-start-date" className="block text-xs font-medium text-foreground mb-1.5">开工日期 <span className="text-destructive">*</span></label>
                    <Input id="proj-start-date" required type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="proj-status" className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                    <select
                      id="proj-status"
                      value={formData.status || '未开工'}
                      onChange={e => setFormData({ ...formData, status: e.target.value as AdminProject['status'] })}
                      className="w-full h-8 px-2.5 bg-transparent border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="未开工">未开工</option>
                      <option value="施工中">施工中</option>
                      <option value="维保中">维保中</option>
                      <option value="已完工">已完工</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="proj-budget" className="block text-xs font-medium text-foreground mb-1.5">预算 (元)</label>
                  <Input id="proj-budget" required type="number" min={0} value={formData.budget ?? 0} onChange={e => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })} />
                </div>
              </form>
            )}
          </div>

          <DialogFooter>
            {modalMode === 'view' ? (
              <>
                <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
                <Button onClick={() => setModalMode('edit')}>
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
              </>
            ) : (
              <>
                <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
                <Button type="submit" form="projectForm" disabled={isSubmitting}>
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : '保存'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              确认删除项目？
            </DialogTitle>
            <DialogDescription className="text-center">删除后将无法恢复，请确认是否继续操作。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <DialogClose render={<Button variant="outline" className="flex-1" />}>取消</DialogClose>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
