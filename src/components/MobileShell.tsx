/**
 * MobileShell.tsx
 * 移动端页面的外壳/布局组件。
 * 负责渲染移动端底部的导航栏 (TabBar)，并根据当前用户的角色动态显示对应的导航菜单。
 */
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Home, CalendarDays, BarChart2, Briefcase, AlertCircle, MapPin, LayoutGrid, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const { role } = useAppStore();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const workerNav = [
    { name: '打卡', path: '/', icon: Home },
    { name: '考勤', path: '/attendance', icon: CalendarDays },
    { name: '统计', path: '/stats', icon: BarChart2 },
    { name: '工作台', path: '/workbench', icon: LayoutGrid },
  ];

  const SHOW_TODAY_SITE = false; // Control variable to show/hide '今日现场'

  const foremanNav = [
    { name: '记工', path: '/', icon: Briefcase },
    { name: '考勤', path: '/foreman-attendance', icon: CalendarDays },
    { name: '异常处理', path: '/exceptions', icon: AlertCircle },
    ...(SHOW_TODAY_SITE ? [{ name: '今日现场', path: '/site', icon: MapPin }] : []),
    { name: '工作台', path: '/workbench', icon: LayoutGrid },
  ];

  const bossNav = [
    { name: '首页', path: '/', icon: Home },
    { name: '考勤', path: '/attendance', icon: CalendarDays },
    { name: '报销', path: '/reimbursement', icon: FileText },
    { name: '工作台', path: '/workbench', icon: LayoutGrid },
  ];

  const navItems = role === 'worker' ? workerNav : role === 'foreman' ? foremanNav : bossNav;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 w-full">
      {/* Content Area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center px-2 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
                isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
