import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, Clock, AlertCircle, Search, Edit, Check, X } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { request } from '@/lib/api';
import { cn, extractList, getProjectStatusStyle } from '@/lib/utils';
import { foremanApi } from '@/services/foreman';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Card, StatCard } from '@/components/ui/Card';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Pagination } from '@/components/ui/Pagination';
import { useToast, Toast } from '@/components/ui/Toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import type { Exception, BossEmployee, AdminAttendanceRecord } from '@/types/models';

interface AttendanceSummary {
  summary: { totalPresent: number; presentRate: number; totalOvertime: number; overtimeGrowth: number };
  projects: Array<{ id: number; name: string; total: number; present: number; absent: number; overtime: number; status: string }>;
}

interface ProjectAttendanceDetail {
  summary: { total: number; present: number; absent: number; overtime: number; attendanceRate: number };
  workers: Array<{ id: number; name: string; role: string; presentDays: number; overtimeHours: number }>;
  dailyRecords: Array<{ id: number; date: string; present: number; absent: number; overtime: number }>;
}

interface EmployeeDetail {
  employeeId: number;
  employeeName: string;
  team: string;
  project: string;
  summary: { totalDays: number; presentDays: number; absentDays: number; overtimeHours: number; attendanceRate: number };
  records: AdminAttendanceRecord[];
}

type TabKey = 'employees' | 'projects' | 'exceptions';
const EMP_PAGE_SIZE = 10;

const getAttendanceStatusStyle = (status: string) => {
  switch (status) {
    case '正常出勤': case 'present': return 'bg-emerald-500/10 text-emerald-600';
    case '缺勤': case 'absent': return 'bg-destructive/10 text-destructive';
    case '迟到': return 'bg-amber-500/10 text-amber-600';
    case '早退': return 'bg-orange-500/10 text-orange-600';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getAttendanceStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return '已出勤';
    case 'absent': return '缺勤';
    default: return status;
  }
};

const getExceptionStatusStyle = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-500/10 text-amber-600';
    case 'handled': return 'bg-emerald-500/10 text-emerald-600';
    case 'rejected': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getExceptionStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待处理';
    case 'handled': return '已处理';
    case 'rejected': return '已驳回';
    default: return status;
  }
};

const selectClass = 'h-8 px-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20';

export default function AdminAttendance() {
  usePageTitle('考勤管理');
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees] = useState<BossEmployee[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('employees');

  // Employee tab filters
  const [empSearch, setEmpSearch] = useState('');
  const [empProjectFilter, setEmpProjectFilter] = useState('all');
  const [empStatusFilter, setEmpStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [empPage, setEmpPage] = useState(1);

  // Exception tab filters
  const [excStatusFilter, setExcStatusFilter] = useState<'all' | 'pending' | 'handled' | 'rejected'>('all');

  // Employee detail dialog
  const [empDetailOpen, setEmpDetailOpen] = useState(false);
  const [empDetailData, setEmpDetailData] = useState<EmployeeDetail | null>(null);
  const [empDetailLoading, setEmpDetailLoading] = useState(false);

  // Edit record dialog
  const [editRecordOpen, setEditRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdminAttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ status: '正常出勤', overtime: 0, notes: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Project detail dialog
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [projectDetailData, setProjectDetailData] = useState<ProjectAttendanceDetail | null>(null);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [projectDetailTab, setProjectDetailTab] = useState<'daily' | 'workers'>('daily');
  const [selectedProjectName, setSelectedProjectName] = useState('');

  // Exception handle dialog
  const [excHandleId, setExcHandleId] = useState<number | null>(null);
  const [excHandleMode, setExcHandleMode] = useState<'approve' | 'reject'>('approve');
  const [excNotes, setExcNotes] = useState('');
  const [excRejectReason, setExcRejectReason] = useState('');
  const [excDayShift, setExcDayShift] = useState('1');
  const [excOvertimeHours, setExcOvertimeHours] = useState('0');

  const { toast, showToast } = useToast();

  useEffect(() => {
    Promise.all([
      request('/api/v1/attendance/summary').then(r => r.code === 200 ? setAttendanceSummary(r.data) : null),
      request('/api/v1/boss/employees').then(r => r.code === 200 ? setEmployees(extractList(r.data)) : null),
      request('/api/v1/foreman/exceptions').then(r => r.code === 200 ? setExceptions(extractList(r.data)) : null),
    ]).finally(() => setLoading(false));
  }, []);

  const projectNames = useMemo(() => [...new Set(employees.map(e => e.project).filter(Boolean))], [employees]);
  const pendingCount = useMemo(() => exceptions.filter(e => e.status === 'pending').length, [exceptions]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = !empSearch || e.name.includes(empSearch);
      const matchesProject = empProjectFilter === 'all' || e.project === empProjectFilter;
      const matchesStatus = empStatusFilter === 'all' || e.status === empStatusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [employees, empSearch, empProjectFilter, empStatusFilter]);

  const pagedEmployees = useMemo(() =>
    filteredEmployees.slice((empPage - 1) * EMP_PAGE_SIZE, empPage * EMP_PAGE_SIZE),
    [filteredEmployees, empPage]
  );

  const filteredExceptions = useMemo(() =>
    excStatusFilter === 'all' ? exceptions : exceptions.filter(e => e.status === excStatusFilter),
    [exceptions, excStatusFilter]
  );

  const openEmployeeDetail = async (employee: BossEmployee) => {
    setEmpDetailOpen(true);
    setEmpDetailLoading(true);
    try {
      const res = await request(`/api/v1/boss/employee-detail?id=${employee.id}`);
      if (res.code === 200) {
        const data = res.data;
        data.records = data.records.map((r: any) => ({
          ...r,
          status: r.status === 'present' ? '正常出勤' : r.status === 'absent' ? '缺勤' : r.status,
        }));
        setEmpDetailData(data);
      }
    } catch (err) {
      console.error('Failed to fetch employee detail:', err);
      showToast('加载员工详情失败');
    } finally {
      setEmpDetailLoading(false);
    }
  };

  const openProjectDetail = async (projectName: string) => {
    setSelectedProjectName(projectName);
    setProjectDetailOpen(true);
    setProjectDetailLoading(true);
    setProjectDetailTab('daily');
    try {
      const res = await request(`/api/v1/boss/project-attendance-detail?name=${encodeURIComponent(projectName)}`);
      if (res.code === 200) setProjectDetailData(res.data);
    } catch (err) {
      console.error('Failed to fetch project detail:', err);
      showToast('加载项目详情失败');
    } finally {
      setProjectDetailLoading(false);
    }
  };

  const openEditRecord = (record: AdminAttendanceRecord) => {
    setEditingRecord(record);
    setEditForm({ status: record.status, overtime: record.overtime, notes: record.notes || '' });
    setEditRecordOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingRecord || !empDetailData) return;
    setEditSubmitting(true);
    const originalRecord = { ...editingRecord };
    setEmpDetailData(prev => prev ? {
      ...prev,
      records: prev.records.map(r => r.id === editingRecord.id ? { ...r, ...editForm } : r),
    } : prev);

    try {
      await request(`/api/v1/admin/attendance/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      showToast('考勤记录已更新');
      setEditRecordOpen(false);
    } catch (err) {
      console.error('Failed to update record:', err);
      setEmpDetailData(prev => prev ? {
        ...prev,
        records: prev.records.map(r => r.id === originalRecord.id ? originalRecord : r),
      } : prev);
      showToast('更新失败，已恢复');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleException = async () => {
    if (!excHandleId) return;
    try {
      if (excHandleMode === 'approve') {
        await foremanApi.processException(excHandleId, {
          dayShift: parseFloat(excDayShift) || 0, overtimeHours: parseFloat(excOvertimeHours) || 0, notes: excNotes,
        });
      } else {
        await foremanApi.rejectException(excHandleId, { reason: excRejectReason });
      }
      setExceptions(prev => prev.map(e =>
        e.id === excHandleId ? { ...e, status: excHandleMode === 'approve' ? 'handled' : 'rejected' } : e
      ));
      showToast(excHandleMode === 'approve' ? '异常已处理' : '异常已驳回');
    } catch (err) {
      console.error('Failed to handle exception:', err);
      showToast('操作失败');
    } finally {
      setExcHandleId(null);
      setExcNotes('');
      setExcRejectReason('');
      setExcDayShift('1');
      setExcOvertimeHours('0');
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'employees', label: '员工考勤' },
    { key: 'projects', label: '项目考勤' },
    { key: 'exceptions', label: '异常管理' },
  ];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="今日出勤人数" value={attendanceSummary?.summary.totalPresent ?? 0} icon={<Users className="w-5 h-5" />} />
            <StatCard label="出勤率" value={`${attendanceSummary?.summary.presentRate ?? 0}%`} icon={<TrendingUp className="w-5 h-5" />} />
            <StatCard label="加班人次" value={attendanceSummary?.summary.totalOvertime ?? 0} icon={<Clock className="w-5 h-5" />} />
            <StatCard label="待处理异常" value={pendingCount} icon={<AlertCircle className="w-5 h-5" />} />
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Employee Attendance */}
      {activeTab === 'employees' && (
        <Card>
          <div className="px-4 py-3 border-b border-border flex flex-wrap gap-3 items-center bg-muted/30">
            <InputGroup className="w-56">
              <InputGroupAddon><Search className="w-4 h-4" /></InputGroupAddon>
              <InputGroupInput
                placeholder="搜索员工姓名..."
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setEmpPage(1); }}
              />
            </InputGroup>
            <select value={empProjectFilter} onChange={e => { setEmpProjectFilter(e.target.value); setEmpPage(1); }} className={selectClass}>
              <option value="all">全部项目</option>
              {projectNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={empStatusFilter} onChange={e => { setEmpStatusFilter(e.target.value as typeof empStatusFilter); setEmpPage(1); }} className={selectClass}>
              <option value="all">全部状态</option>
              <option value="present">已出勤</option>
              <option value="absent">缺勤</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : pagedEmployees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">暂无相关员工数据</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" aria-label="员工考勤列表">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">员工姓名</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">班组</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">签到时间</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">加班(小时)</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pagedEmployees.map(emp => (
                    <tr key={emp.id}
                      onClick={() => openEmployeeDetail(emp)}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{emp.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{emp.team}</td>
                      <td className="px-5 py-3 text-muted-foreground">{emp.project}</td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getAttendanceStatusStyle(emp.status))}>
                          {getAttendanceStatusLabel(emp.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{emp.time ?? '-'}</td>
                      <td className="px-5 py-3 tabular-nums">{emp.overtime > 0 ? emp.overtime : '-'}</td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="xs" onClick={() => openEmployeeDetail(emp)}>详情</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={empPage} pageSize={EMP_PAGE_SIZE} total={filteredEmployees.length} onPageChange={setEmpPage} />
        </Card>
      )}

      {/* Tab 2: Project Attendance */}
      {activeTab === 'projects' && (
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : (
              <table className="w-full text-left border-collapse" aria-label="项目考勤列表">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目名称</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">总人数</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">出勤</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">缺勤</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">加班</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">出勤率</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(attendanceSummary?.projects ?? []).map(p => {
                    const rate = p.total > 0 ? ((p.present / p.total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={p.id}
                        onClick={() => openProjectDetail(p.name)}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{p.total}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-foreground">{p.present}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-destructive">{p.absent}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{p.overtime}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{rate}%</td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getProjectStatusStyle(p.status))}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Exception Management */}
      {activeTab === 'exceptions' && (
        <Card>
          <div className="px-4 py-3 border-b border-border flex gap-2 bg-muted/30">
            {(['all', 'pending', 'handled', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setExcStatusFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  excStatusFilter === status
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {status === 'all' ? '全部' : getExceptionStatusLabel(status)}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : filteredExceptions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">暂无异常记录</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" aria-label="考勤异常列表">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">员工姓名</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">日期</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">原因</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredExceptions.map(exc => (
                    <tr key={exc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{exc.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{exc.date}</td>
                      <td className="px-5 py-3 text-muted-foreground">{exc.reason}</td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getExceptionStatusStyle(exc.status))}>
                          {getExceptionStatusLabel(exc.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {exc.status === 'pending' && (
                          <Button variant="ghost" size="xs" onClick={() => { setExcHandleId(exc.id); setExcHandleMode('approve'); }}>
                            处理
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={empDetailOpen} onOpenChange={open => { if (!open) { setEmpDetailOpen(false); setEmpDetailData(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>员工考勤详情</DialogTitle>
            {empDetailData && (
              <DialogDescription>
                {empDetailData.employeeName} · {empDetailData.team} · {empDetailData.project}
              </DialogDescription>
            )}
          </DialogHeader>
          {empDetailLoading ? (
            <div className="py-4"><SkeletonTable rows={5} cols={4} /></div>
          ) : empDetailData ? (
            <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: '总天数', value: empDetailData.summary.totalDays, color: 'text-foreground' },
                  { label: '出勤天数', value: empDetailData.summary.presentDays, color: 'text-emerald-600' },
                  { label: '缺勤天数', value: empDetailData.summary.absentDays, color: 'text-destructive' },
                  { label: '出勤率', value: `${empDetailData.summary.attendanceRate}%`, color: 'text-foreground' },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/40 rounded-lg p-3 border border-border/50 text-center">
                    <div className={cn("text-lg font-semibold tabular-nums", stat.color)}>{stat.value}</div>
                    <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              <table className="w-full text-left border-collapse" aria-label="考勤记录">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">日期</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">签到时间</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">加班</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {empDetailData.records.slice(0, 20).map(record => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground">{record.date}</td>
                      <td className="px-3 py-2">
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", getAttendanceStatusStyle(record.status))}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{record.time ?? '-'}</td>
                      <td className="px-3 py-2 tabular-nums">{record.overtime > 0 ? `${record.overtime}h` : '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="xs" onClick={() => openEditRecord(record)}>
                          <Edit className="w-3 h-3" /> 编辑
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={editRecordOpen} onOpenChange={open => { if (!open) setEditRecordOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑考勤记录</DialogTitle>
            {editingRecord && (
              <DialogDescription>
                日期: {editingRecord.date} · {editingRecord.time ?? '无打卡记录'}
              </DialogDescription>
            )}
          </DialogHeader>
          <form id="editRecordForm" onSubmit={e => { e.preventDefault(); handleEditSubmit(); }} className="space-y-4 -mx-4 px-4">
            <div>
              <label htmlFor="edit-status" className="block text-xs font-medium text-foreground mb-1.5">考勤状态</label>
              <select id="edit-status" value={editForm.status}
                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className={cn('w-full', selectClass)}
              >
                <option value="正常出勤">正常出勤</option>
                <option value="缺勤">缺勤</option>
                <option value="迟到">迟到</option>
                <option value="早退">早退</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-overtime" className="block text-xs font-medium text-foreground mb-1.5">加班时长 (小时)</label>
              <Input id="edit-overtime" type="number" min={0} step={0.5} value={editForm.overtime}
                onChange={e => setEditForm(prev => ({ ...prev, overtime: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label htmlFor="edit-notes" className="block text-xs font-medium text-foreground mb-1.5">备注</label>
              <Textarea id="edit-notes" value={editForm.notes}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="可选填写修改备注..." rows={3} />
            </div>
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button type="submit" form="editRecordForm" disabled={editSubmitting}>
              {editSubmitting ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={projectDetailOpen} onOpenChange={open => { if (!open) { setProjectDetailOpen(false); setProjectDetailData(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>项目考勤详情</DialogTitle>
            <DialogDescription>{selectedProjectName}</DialogDescription>
          </DialogHeader>
          {projectDetailLoading ? (
            <div className="py-4"><SkeletonTable rows={5} cols={4} /></div>
          ) : projectDetailData ? (
            <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: '总人数', value: projectDetailData.summary.total, color: 'text-foreground' },
                  { label: '出勤', value: projectDetailData.summary.present, color: 'text-emerald-600' },
                  { label: '缺勤', value: projectDetailData.summary.absent, color: 'text-destructive' },
                  { label: '出勤率', value: `${projectDetailData.summary.attendanceRate}%`, color: 'text-foreground' },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/40 rounded-lg p-3 border border-border/50 text-center">
                    <div className={cn("text-lg font-semibold tabular-nums", stat.color)}>{stat.value}</div>
                    <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex border-b border-border gap-4">
                {(['daily', 'workers'] as const).map(tab => (
                  <button key={tab} onClick={() => setProjectDetailTab(tab)}
                    className={cn("pb-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                      projectDetailTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>
                    {tab === 'daily' ? '每日记录' : '工人列表'}
                  </button>
                ))}
              </div>
              {projectDetailTab === 'daily' ? (
                <table className="w-full text-left border-collapse" aria-label="每日记录">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">日期</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">出勤</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">缺勤</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">加班</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {projectDetailData.dailyRecords.slice(0, 15).map(dr => (
                      <tr key={dr.id} className="border-b border-border/50">
                        <td className="px-3 py-2 text-muted-foreground">{dr.date}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{dr.present}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-destructive">{dr.absent}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{dr.overtime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse" aria-label="工人列表">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">姓名</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">工种</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">出勤天数</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">加班时长</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {projectDetailData.workers.map(w => (
                      <tr key={w.id} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium text-foreground">{w.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{w.role}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.presentDays}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{w.overtimeHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exception Handle Dialog */}
      <Dialog open={excHandleId !== null} onOpenChange={open => { if (!open) setExcHandleId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>处理考勤异常</DialogTitle>
            <DialogDescription>
              {excHandleMode === 'approve' ? '确认该异常已处理' : '驳回该异常记录'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 -mx-4 px-4">
            <div className="flex gap-2">
              <Button variant={excHandleMode === 'approve' ? 'default' : 'outline'} size="sm" onClick={() => setExcHandleMode('approve')} className="flex-1">
                <Check className="w-3.5 h-3.5" /> 通过
              </Button>
              <Button variant={excHandleMode === 'reject' ? 'destructive' : 'outline'} size="sm" onClick={() => setExcHandleMode('reject')} className="flex-1">
                <X className="w-3.5 h-3.5" /> 驳回
              </Button>
            </div>
            {excHandleMode === 'approve' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">班次 (天)</label>
                    <Input type="number" min={0} value={excDayShift} onChange={e => setExcDayShift(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">加班时长 (小时)</label>
                    <Input type="number" min={0} step={0.5} value={excOvertimeHours} onChange={e => setExcOvertimeHours(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                  <Textarea value={excNotes} onChange={e => setExcNotes(e.target.value)} placeholder="可选填写处理备注..." rows={3} />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">驳回原因 <span className="text-destructive">*</span></label>
                <Textarea value={excRejectReason} onChange={e => setExcRejectReason(e.target.value)} placeholder="请填写驳回原因..." rows={3} />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button onClick={handleException} variant={excHandleMode === 'reject' ? 'destructive' : 'default'}
              disabled={excHandleMode === 'reject' && !excRejectReason.trim()}>
              确认{excHandleMode === 'approve' ? '通过' : '驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast toast={toast} />
    </div>
  );
}
