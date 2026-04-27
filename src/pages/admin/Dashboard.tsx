import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, AlertCircle, TrendingUp, ArrowRight, Check, X } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getProjectStatusStyle, getProgressByStatus } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { request } from '@/lib/api';
import { foremanApi } from '@/services/foreman';
import type { AdminProject, Exception } from '@/types/models';

interface AttendanceSummary {
  summary: { totalPresent: number; presentRate: number; totalOvertime: number; overtimeGrowth: number; monthlyHours: number; dailyTrend: Array<{ date: string; count: number; label: string }> };
  projects: Array<{ id: number; name: string; total: number; present: number; absent: number; overtime: number; status: string }>;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function AdminDashboard() {
  usePageTitle('仪表盘');
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [workerCount, setWorkerCount] = useState(0);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Exception handling dialog
  const [handleDialogId, setHandleDialogId] = useState<number | null>(null);
  const [handleMode, setHandleMode] = useState<'approve' | 'reject'>('approve');
  const [handleNotes, setHandleNotes] = useState('');
  const [handleRejectReason, setHandleRejectReason] = useState('');
  const [handleDayShift, setHandleDayShift] = useState('1');
  const [handleOvertimeHours, setHandleOvertimeHours] = useState('0');

  useEffect(() => {
    Promise.all([
      request('/api/v1/projects').then(r => r.code === 200 ? setProjects(r.data) : null),
      foremanApi.getWorkers().then(r => setWorkerCount(r.data.length)),
      request('/api/v1/foreman/exceptions').then(r => r.code === 200 ? setExceptions(r.data) : null),
      request('/api/v1/attendance/summary').then(r => r.code === 200 ? setAttendanceData(r.data) : null),
    ]).finally(() => setLoading(false));
  }, []);

  const pendingExceptions = exceptions.filter(e => e.status === 'pending');
  const inProgress = projects.filter(p => p.status === '施工中');
  const totalHours = attendanceData?.summary.monthlyHours ?? workerCount * 22 * 8;

  const trend = attendanceData?.summary.dailyTrend;
  const weeklyValues = trend ? trend.map(d => d.count) : [186, 203, 175, 210, 195, 42, 38];
  const weeklyLabels = trend ? trend.map(d => d.label) : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const maxVal = Math.max(...weeklyValues);

  const handleException = async () => {
    if (!handleDialogId) return;
    try {
      if (handleMode === 'approve') {
        await foremanApi.processException(handleDialogId, {
          dayShift: parseFloat(handleDayShift) || 0, overtimeHours: parseFloat(handleOvertimeHours) || 0, notes: handleNotes,
        });
      } else {
        await foremanApi.rejectException(handleDialogId, {
          reason: handleRejectReason,
        });
      }
      setExceptions(prev => prev.map(e => e.id === handleDialogId ? { ...e, status: handleMode === 'approve' ? 'handled' : 'rejected' } : e));
    } catch (err) {
      console.error('Failed to handle exception:', err);
    } finally {
      setHandleDialogId(null);
      setHandleNotes('');
      setHandleRejectReason('');
      setHandleDayShift('1');
      setHandleOvertimeHours('0');
    }
  };

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="在建项目" value={inProgress.length} icon={<Briefcase className="w-5 h-5" />} onClick={() => navigate('/admin/projects')} />
            <StatCard label="今日在岗" value={workerCount} icon={<Users className="w-5 h-5" />} onClick={() => navigate('/admin/employees')} />
            <StatCard label="考勤异常" value={pendingExceptions.length} icon={<AlertCircle className="w-5 h-5" />} />
            <StatCard label="本月工时" value={totalHours.toLocaleString()} icon={<TrendingUp className="w-5 h-5" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>近七日出勤趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex items-end justify-between gap-3 h-[180px]" role="img" aria-label="近七日出勤趋势图">
              <div
                className="absolute left-0 right-0 border-t border-dashed border-border pointer-events-none"
                style={{ bottom: '140px' }}
              />
              {weeklyValues.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{val}</span>
                  <div
                    className="w-full bg-chart-1 rounded-sm transition-all min-h-[4px]"
                    style={{ height: `${(val / maxVal) * 140}px` }}
                    title={`${weeklyLabels[i]}: ${val}人`}
                  />
                  <span className="text-[11px] text-muted-foreground">{weeklyLabels[i]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>活跃项目</CardTitle>
            <Button variant="ghost" size="xs" onClick={() => navigate('/admin/projects')}>
              查看全部
              <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <SkeletonTable rows={3} cols={2} />
            ) : inProgress.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">暂无施工中项目</div>
            ) : (
              inProgress.slice(0, 5).map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate('/admin/projects')}
                  className="flex items-center justify-between py-2 px-2 -mx-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{project.name}</div>
                    <div className="text-[11px] text-muted-foreground">{project.manager}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${getProgressByStatus(project.status)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{getProgressByStatus(project.status)}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Exceptions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>待办事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <SkeletonTable rows={3} cols={2} />
            ) : pendingExceptions.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">暂无待办事项</div>
            ) : (
              pendingExceptions.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-2 -mx-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center min-w-0 gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{item.name} - {item.reason}</div>
                      <div className="text-[11px] text-muted-foreground">{item.date}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" className="shrink-0 text-muted-foreground" onClick={() => { setHandleDialogId(item.id); setHandleMode('approve'); }}>
                    去处理
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary Table */}
      {attendanceData && attendanceData.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>项目出勤概览</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="项目出勤概览">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">项目</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">状态</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">总人数</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">出勤</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">缺勤</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">加班</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {attendanceData.projects.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-foreground">{p.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${getProjectStatusStyle(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{p.total}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{p.present}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-destructive">{p.absent}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{p.overtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exception Handling Dialog */}
      <Dialog open={handleDialogId !== null} onOpenChange={(open) => { if (!open) setHandleDialogId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>处理考勤异常</DialogTitle>
            <DialogDescription>
              {handleMode === 'approve' ? '确认该异常已处理，标记为正常出勤' : '驳回该异常记录'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 -mx-4 px-4">
            <div className="flex gap-2">
              <Button
                variant={handleMode === 'approve' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHandleMode('approve')}
                className="flex-1"
              >
                <Check className="w-3.5 h-3.5" />
                通过
              </Button>
              <Button
                variant={handleMode === 'reject' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setHandleMode('reject')}
                className="flex-1"
              >
                <X className="w-3.5 h-3.5" />
                驳回
              </Button>
            </div>
            {handleMode === 'approve' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">班次 (天)</label>
                    <Input type="number" min={0} value={handleDayShift} onChange={e => setHandleDayShift(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">加班时长 (小时)</label>
                    <Input type="number" min={0} step={0.5} value={handleOvertimeHours} onChange={e => setHandleOvertimeHours(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                  <Textarea
                    value={handleNotes}
                    onChange={e => setHandleNotes(e.target.value)}
                    placeholder="可选填写处理备注..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">驳回原因 <span className="text-destructive">*</span></label>
                <Textarea
                  value={handleRejectReason}
                  onChange={e => setHandleRejectReason(e.target.value)}
                  placeholder="请填写驳回原因..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button
              onClick={handleException}
              variant={handleMode === 'reject' ? 'destructive' : 'default'}
              disabled={handleMode === 'reject' && !handleRejectReason.trim()}
            >
              确认{handleMode === 'approve' ? '通过' : '驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
