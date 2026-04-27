/**
 * Workbench.tsx (Shared)
 * 共享页面：通用工作台。
 * 作为各角色的功能入口集合页。根据不同角色动态渲染功能入口与后端下发的待办事项。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  BellRing,
  Briefcase,
  Calculator,
  Calendar,
  CheckCircle2,
  FileText,
  LogOut,
  Receipt,
  Settings,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { request } from '@/lib/api';
import { extractList } from '@/lib/utils';
import { BackendWorkbenchTodo, normalizeWorkbenchTodos, WorkbenchTodoCard } from './workbenchTodos';

const roleLabel = {
  worker: '工人端',
  foreman: '班组长端',
  boss: '老板端',
  admin: '管理端',
};

const todoIconMap = {
  report: {
    Icon: FileText,
    iconClassName: 'bg-blue-100 text-blue-600',
  },
  attendance: {
    Icon: BellRing,
    iconClassName: 'bg-orange-100 text-orange-600',
  },
  reimbursement: {
    Icon: Receipt,
    iconClassName: 'bg-emerald-100 text-emerald-600',
  },
  default: {
    Icon: FileText,
    iconClassName: 'bg-gray-100 text-gray-600',
  },
} as const;

function LoadingTodoCard() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-7 w-16 animate-pulse rounded-full bg-gray-200" />
    </div>
  );
}

export default function MobileWorkbench() {
  usePageTitle('工作台');
  const { role } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [todos, setTodos] = useState<WorkbenchTodoCard[]>([]);

  useEffect(() => {
    let alive = true;

    const fetchTodos = async () => {
      setLoadingTodos(true);

      try {
        const res = await request<BackendWorkbenchTodo[]>('/api/v1/todos?status=pending');
        if (alive) {
          setTodos(normalizeWorkbenchTodos(extractList(res.data), role));
        }
      } catch (err) {
        console.error('Failed to fetch workbench todos:', err);
        if (alive) {
          setTodos([]);
        }
      } finally {
        if (alive) {
          setLoadingTodos(false);
        }
      }
    };

    fetchTodos();

    return () => {
      alive = false;
    };
  }, [role]);

  const modules = useMemo(
    () => [
      { id: 'daily-report', name: '日报', icon: FileText, color: 'bg-blue-100 text-blue-600' },
      ...(role !== 'boss' ? [{ id: 'reimbursement', name: '报销', icon: Receipt, color: 'bg-green-100 text-green-600' }] : []),
      ...(role === 'boss'
        ? [
            { id: 'contracts', name: '收入合同', icon: Briefcase, color: 'bg-indigo-100 text-indigo-600' },
            { id: 'income-settlement', name: '收入结算', icon: Wallet, color: 'bg-teal-100 text-teal-600' },
            { id: 'reimbursement-overview', name: '报销概览', icon: Receipt, color: 'bg-emerald-100 text-emerald-600' },
            { id: 'project-cost', name: '项目成本', icon: Calculator, color: 'bg-blue-100 text-blue-600' },
          ]
        : []),
      { id: 'schedule', name: '排班', icon: Calendar, color: 'bg-purple-100 text-purple-600', disabled: true },
      { id: 'settings', name: '设置', icon: Settings, color: 'bg-gray-100 text-gray-600', disabled: true },
    ],
    [role],
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProcess = (todo: WorkbenchTodoCard) => {
    if (!todo.actionUrl) return;
    navigate(todo.actionUrl);
  };

  return (
    <div className="flex min-h-full flex-col bg-gray-50 pb-4">
      <div className="relative z-10 bg-white px-4 pb-5 pt-12 shadow-sm">
        <h1 className="text-center text-lg font-bold text-gray-800">工作台</h1>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <UserRound className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold text-gray-900">{user?.name || '用户'}</div>
              <div className="text-[11px] font-medium text-gray-400">{roleLabel[role]}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="ml-3 inline-flex items-center rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 active:bg-gray-100"
          >
            <LogOut className="mr-1 h-3.5 w-3.5" />
            退出
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">常用应用</h2>
          <div className="grid grid-cols-4 gap-x-4 gap-y-6">
            {modules.map((mod) => {
              const Icon = mod.icon;

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (mod.disabled) return;
                    if (mod.id === 'daily-report') {
                      navigate('/daily-report');
                    } else if (mod.id === 'reimbursement') {
                      navigate('/reimbursement');
                    } else if (mod.id === 'contracts') {
                      navigate('/boss/contracts?tab=income');
                    } else if (mod.id === 'income-settlement') {
                      navigate('/boss/income-settlement');
                    } else if (mod.id === 'reimbursement-overview') {
                      navigate('/boss/reimbursement-overview');
                    } else if (mod.id === 'project-cost') {
                      navigate('/boss/project-cost');
                    }
                  }}
                  disabled={mod.disabled}
                  className={`relative flex flex-col items-center justify-center space-y-2 transition-transform ${
                    mod.disabled ? 'cursor-not-allowed opacity-55' : 'active:scale-95'
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${mod.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{mod.name}</span>
                  {mod.disabled && (
                    <span className="absolute -top-2 right-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                      即将上线
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">待办事项</h2>

          {loadingTodos ? (
            <div className="flex flex-col space-y-3">
              <LoadingTodoCard />
              <LoadingTodoCard />
            </div>
          ) : todos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="mt-3 text-sm font-bold text-gray-700">暂无待办事项</div>
              <div className="mt-1 text-xs text-gray-500">当前没有需要处理的任务</div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {todos.map((todo) => {
                const presentation = todoIconMap[todo.icon] || todoIconMap.default;
                const Icon = presentation.Icon;

                return (
                  <div key={todo.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex min-w-0 items-center space-x-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${presentation.iconClassName}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-800">{todo.title}</div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">{todo.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleProcess(todo)}
                      className={`ml-3 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                        todo.priority === 'high'
                          ? 'bg-orange-50 text-orange-600 active:bg-orange-100'
                          : 'bg-orange-50 text-orange-600 active:bg-orange-100'
                      }`}
                    >
                      {todo.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
