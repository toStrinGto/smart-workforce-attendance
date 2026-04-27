import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Map, Settings, LogOut, Users, ChevronRight, CalendarCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: '工作台', path: '/admin', icon: LayoutDashboard },
  { name: '项目管理', path: '/admin/projects', icon: Map },
  { name: '员工管理', path: '/admin/employees', icon: Users },
  { name: '考勤管理', path: '/admin/attendance', icon: CalendarCheck },
  { name: '系统设置', path: '/admin/settings', icon: Settings },
];

const breadcrumbMap: Record<string, string> = {
  '/admin': '工作台',
  '/admin/projects': '项目管理',
  '/admin/employees': '员工管理',
  '/admin/attendance': '考勤管理',
  '/admin/settings': '系统设置',
};

export default function WebAdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentBreadcrumb = breadcrumbMap[location.pathname];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 bg-admin-sidebar text-slate-400 flex flex-col shrink-0 border-r border-white/5">
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <span className="text-sm font-semibold text-white tracking-tight">智工考勤后台</span>
        </div>
        <nav className="flex-1 py-3">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                      isActive
                        ? "bg-white/[0.08] text-white font-medium"
                        : "hover:bg-white/[0.04] hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2.5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                {user?.name?.[0] || '管'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{user?.name || '管理员'}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={handleLogout} className="text-slate-500 hover:text-slate-200 shrink-0" aria-label="退出登录">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center text-xs text-muted-foreground">
            <span>管理后台</span>
            {currentBreadcrumb && (
              <>
                <ChevronRight className="w-3 h-3 mx-1 text-border" />
                <span className="font-medium text-foreground">{currentBreadcrumb}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center text-xs font-semibold">
              {user?.name?.[0] || '管'}
            </div>
            <span className="text-xs font-medium text-foreground">{user?.name || '管理员'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
