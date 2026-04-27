import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Users, AlertTriangle } from 'lucide-react';
import { Worker } from '@/types/models';
import { usePageTitle } from '@/hooks/usePageTitle';
import { request } from '@/lib/api';
import { extractList } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Card } from '@/components/ui/Card';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['木工', '钢筋工', '泥瓦工', '水电工', '普工', '焊工', '架子工', '油漆工', '装修工', '其他'];
const STATUS_OPTIONS: { value: 'active' | 'inactive'; label: string }[] = [
  { value: 'active', label: '在职' },
  { value: 'inactive', label: '离职' },
];

interface FormData {
  name: string;
  phone: string;
  role: string;
  team: string;
  dailyWage: string;
  status: 'active' | 'inactive';
}

const emptyForm: FormData = {
  name: '',
  phone: '',
  role: '普工',
  team: '',
  dailyWage: '',
  status: 'active',
};

export default function AdminEmployees() {
  usePageTitle('员工管理');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Add / Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await request<Worker[]>('/api/v1/admin/workers');
      setWorkers(extractList(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // --- Form helpers ---
  const openAdd = () => {
    setEditingWorker(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setForm({
      name: worker.name,
      phone: worker.phone || '',
      role: worker.role,
      team: worker.team || '',
      dailyWage: worker.dailyWage != null ? String(worker.dailyWage) : '',
      status: worker.status || 'active',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errors.name = '请输入姓名';
    if (!form.phone.trim()) errors.phone = '请输入手机号';
    else if (!/^1\d{10}$/.test(form.phone.trim())) errors.phone = '手机号格式不正确';
    if (form.dailyWage && (isNaN(Number(form.dailyWage)) || Number(form.dailyWage) < 0))
      errors.dailyWage = '请输入有效金额';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        team: form.team.trim(),
        dailyWage: form.dailyWage ? Number(form.dailyWage) : 0,
        status: form.status,
        avatar: form.name.trim()[0],
      };
      if (editingWorker) {
        const res = await request<Worker>(`/api/v1/admin/workers/${editingWorker.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setWorkers(ws => ws.map(w => w.id === editingWorker.id ? res.data : w));
      } else {
        const res = await request<Worker>('/api/v1/admin/workers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setWorkers(ws => [res.data, ...ws]);
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (worker: Worker) => {
    setDeletingWorker(worker);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingWorker) return;
    setDeleting(true);
    try {
      await request(`/api/v1/admin/workers/${deletingWorker.id}`, { method: 'DELETE' });
      setWorkers(ws => ws.filter(w => w.id !== deletingWorker.id));
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // --- Filtering & pagination ---
  const filteredWorkers = workers.filter(
    w => w.name.includes(searchQuery) || w.role.includes(searchQuery) || (w.team || '').includes(searchQuery),
  );
  const pagedWorkers = filteredWorkers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = workers.filter(w => w.status !== 'inactive').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">员工管理</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            共 {workers.length} 名员工，在职 {activeCount} 人
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <InputGroup className="flex-1 sm:w-56">
            <InputGroupAddon>
              <Search className="w-4 h-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索姓名、工种或班组..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </InputGroup>
          <Button onClick={openAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加员工
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" aria-label="员工列表">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">员工信息</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">手机号</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">工种</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">班组</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">日薪 (¥)</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-center">状态</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {pagedWorkers.map(worker => (
                    <tr key={worker.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                            {worker.avatar || worker.name[0]}
                          </div>
                          <div className="text-sm font-medium text-foreground">{worker.name}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{worker.phone || '-'}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                          {worker.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{worker.team || '-'}</td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">
                        {worker.dailyWage != null ? worker.dailyWage.toFixed(2) : <span className="italic text-muted-foreground">未设置</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          worker.status === 'inactive'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {worker.status === 'inactive' ? '离职' : '在职'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(worker)} aria-label="编辑">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => openDelete(worker)} aria-label="删除">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedWorkers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-sm">
                        没有找到匹配的员工
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filteredWorkers.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWorker ? '编辑员工' : '添加员工'}</DialogTitle>
            <DialogDescription>
              {editingWorker ? '修改员工基本信息并保存' : '填写新员工信息并添加到系统中'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {/* Name */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">姓名 <span className="text-destructive">*</span></label>
              <Input
                placeholder="请输入姓名"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <span className="text-[11px] text-destructive">{formErrors.name}</span>}
            </div>

            {/* Phone */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">手机号 <span className="text-destructive">*</span></label>
              <Input
                placeholder="请输入手机号"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                aria-invalid={!!formErrors.phone}
              />
              {formErrors.phone && <span className="text-[11px] text-destructive">{formErrors.phone}</span>}
            </div>

            {/* Role + Team */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-foreground">工种</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-foreground">班组</label>
                <Input
                  placeholder="所属班组"
                  value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                />
              </div>
            </div>

            {/* Wage + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-foreground">日薪 (¥)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.dailyWage}
                  onChange={e => setForm(f => ({ ...f, dailyWage: e.target.value }))}
                  aria-invalid={!!formErrors.dailyWage}
                />
                {formErrors.dailyWage && <span className="text-[11px] text-destructive">{formErrors.dailyWage}</span>}
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-foreground">状态</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              取消
            </DialogClose>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : editingWorker ? '保存修改' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除员工「{deletingWorker?.name}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>删除后该员工的所有记录将无法恢复</span>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              取消
            </DialogClose>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
