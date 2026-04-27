import { useState, useEffect } from 'react';
import { Clock, FolderOpen, Bell, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast, Toast } from '@/components/ui/Toast';
import { request } from '@/lib/api';
import { SystemSettings, DEFAULT_SETTINGS } from '@/types/models';
import { Skeleton } from '@/components/ui/Skeleton';

const selectClass = 'w-full h-8 px-2.5 bg-transparent border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20';

export default function AdminSettings() {
  usePageTitle('系统设置');
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Attendance rules
  const [clockIn, setClockIn] = useState(DEFAULT_SETTINGS.clockIn);
  const [clockOut, setClockOut] = useState(DEFAULT_SETTINGS.clockOut);
  const [lateGrace, setLateGrace] = useState(String(DEFAULT_SETTINGS.lateGrace));
  const [overtimeStart, setOvertimeStart] = useState(String(DEFAULT_SETTINGS.overtimeStart));
  const [hourMode, setHourMode] = useState(DEFAULT_SETTINGS.hourMode);

  // Project defaults
  const [budgetUnit, setBudgetUnit] = useState(DEFAULT_SETTINGS.budgetUnit);
  const [defaultStatus, setDefaultStatus] = useState(DEFAULT_SETTINGS.defaultStatus);
  const [progressAlert, setProgressAlert] = useState(String(DEFAULT_SETTINGS.progressAlert));
  const [projectPrefix, setProjectPrefix] = useState(DEFAULT_SETTINGS.projectPrefix);

  // Notifications
  const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications);

  useEffect(() => {
    (async () => {
      try {
        const res = await request<SystemSettings>('/api/v1/admin/settings');
        const s = res.data;
        setClockIn(s.clockIn);
        setClockOut(s.clockOut);
        setLateGrace(String(s.lateGrace));
        setOvertimeStart(String(s.overtimeStart));
        setHourMode(s.hourMode);
        setBudgetUnit(s.budgetUnit);
        setDefaultStatus(s.defaultStatus);
        setProgressAlert(String(s.progressAlert));
        setProjectPrefix(s.projectPrefix);
        setNotifications(s.notifications);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (key: keyof typeof notifications) =>
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const payload: SystemSettings = {
        clockIn,
        clockOut,
        lateGrace: Number(lateGrace),
        overtimeStart: Number(overtimeStart),
        hourMode: hourMode as 'standard' | 'flexible',
        budgetUnit,
        defaultStatus,
        progressAlert: Number(progressAlert),
        projectPrefix,
        notifications,
      };
      await request<SystemSettings>('/api/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast(`${section}已保存`);
    } catch (err) {
      showToast('保存失败，请重试');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className={i === 1 ? 'lg:row-span-2' : ''}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Attendance Rules */}
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            考勤规则
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="clock-in" className="block text-xs font-medium text-foreground mb-2">上下班时间</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">上班</span>
                <Input id="clock-in" type="time" value={clockIn} onChange={e => setClockIn(e.target.value)} className="w-28" />
              </div>
              <span className="text-border">—</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">下班</span>
                <Input id="clock-out" type="time" value={clockOut} onChange={e => setClockOut(e.target.value)} className="w-28" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="late-grace" className="block text-xs font-medium text-foreground mb-1.5">迟到宽限（分钟）</label>
              <Input id="late-grace" type="number" min={0} value={lateGrace} onChange={e => setLateGrace(e.target.value)} />
            </div>
            <div>
              <label htmlFor="overtime-start" className="block text-xs font-medium text-foreground mb-1.5">加班起算（下班后小时数）</label>
              <Input id="overtime-start" type="number" min={0} step={0.5} value={overtimeStart} onChange={e => setOvertimeStart(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="hour-mode" className="block text-xs font-medium text-foreground mb-1.5">工时计算方式</label>
            <select id="hour-mode" value={hourMode} onChange={e => setHourMode(e.target.value as 'standard' | 'flexible')} className={selectClass}>
              <option value="standard">标准工时（9小时）</option>
              <option value="flexible">弹性工时</option>
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => handleSave('考勤规则')} disabled={saving}>
              {saving ? '保存中...' : '保存规则'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            项目参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget-unit" className="block text-xs font-medium text-foreground mb-1.5">默认预算单位</label>
              <select id="budget-unit" value={budgetUnit} onChange={e => setBudgetUnit(e.target.value)} className={selectClass}>
                <option value="万元">万元</option>
                <option value="元">元</option>
              </select>
            </div>
            <div>
              <label htmlFor="default-status" className="block text-xs font-medium text-foreground mb-1.5">新建项目默认状态</label>
              <select id="default-status" value={defaultStatus} onChange={e => setDefaultStatus(e.target.value)} className={selectClass}>
                <option value="未开工">未开工</option>
                <option value="施工中">施工中</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="progress-alert" className="block text-xs font-medium text-foreground mb-1.5">进度提醒阈值（%）</label>
              <Input id="progress-alert" type="number" min={0} max={100} value={progressAlert} onChange={e => setProgressAlert(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">进度低于此值时发送提醒</p>
            </div>
            <div>
              <label htmlFor="project-prefix" className="block text-xs font-medium text-foreground mb-1.5">项目编号前缀</label>
              <Input id="project-prefix" value={projectPrefix} onChange={e => setProjectPrefix(e.target.value)} placeholder="P" />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => handleSave('项目参数')} disabled={saving}>
              {saving ? '保存中...' : '保存参数'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            通知设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {([
              { key: 'exception' as const, label: '考勤异常提醒', desc: '工人缺勤、迟到时通知' },
              { key: 'weekly' as const, label: '项目进度周报', desc: '每周发送项目进度汇总' },
              { key: 'delay' as const, label: '项目延期预警', desc: '项目进度低于阈值时预警' },
              { key: 'daily' as const, label: '每日考勤汇总', desc: '每日下班后发送出勤统计' },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm text-foreground">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={notifications[item.key]}
                  aria-label={item.label}
                  onClick={() => toggle(item.key)}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    notifications[item.key] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-transform",
                      notifications[item.key] && "translate-x-4"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={() => handleSave('通知设置')} disabled={saving}>
              {saving ? '保存中...' : '保存通知'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management — full width bottom */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { label: '导出考勤数据', desc: '导出为 Excel 文件', action: '导出' },
              { label: '导出项目数据', desc: '导出项目及预算信息', action: '导出' },
              { label: '重新同步数据', desc: '从服务端重新拉取最新数据', action: '同步' },
              { label: '清除本地缓存', desc: '清除浏览器缓存数据', action: '清除' },
            ]).map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="min-w-0 mr-3">
                  <div className="text-sm text-foreground">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => showToast('功能开发中')}>{item.action}</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Toast toast={toast} />
    </div>
  );
}
