export type WorkbenchTodoId = 'report' | 'sign-in';
export type WorkbenchTodoRole = 'worker' | 'foreman' | 'boss' | 'admin';

export interface DailyReportHistoryItem {
  date?: string | null;
  status?: string | null;
}

export interface WorkerTodayStatusLike {
  nextPunchType?: 'in' | 'out' | null;
}

export interface ForemanSiteStatusLike {
  totalWorkers?: number;
  checkedIn?: number;
  missing?: number;
}

export interface SignInTodoState {
  visible: boolean;
  completed: boolean;
  title: string;
  description: string;
  buttonText: string;
}

export interface BackendWorkbenchTodo {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  deadline?: string | null;
  sourceId?: number | string | null;
  actionUrl?: string | null;
  createdAt?: string | null;
}

export interface WorkbenchTodoCard {
  id: string;
  type: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  icon: 'report' | 'attendance' | 'reimbursement' | 'default';
  priority: 'normal' | 'high';
}

const todoActionRoutes: Record<WorkbenchTodoId, string> = {
  report: '/daily-report',
  'sign-in': '/',
};

export function getTodoActionRoute(id: WorkbenchTodoId, role: WorkbenchTodoRole = 'worker') {
  if (id === 'sign-in' && role === 'foreman') return '/foreman-attendance';
  return todoActionRoutes[id];
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hasSubmittedDailyReportToday(reports: DailyReportHistoryItem[] = [], today = new Date()) {
  const todayKey = formatLocalDate(today);
  return reports.some((report) => String(report.date || '').slice(0, 10) === todayKey);
}

export function getSignInTodoState(
  role: WorkbenchTodoRole,
  workerStatus?: WorkerTodayStatusLike,
  foremanStatus?: ForemanSiteStatusLike,
): SignInTodoState {
  if (role === 'worker') {
    const nextPunchType = workerStatus?.nextPunchType;
    const completed = nextPunchType === null;

    return {
      visible: true,
      completed,
      title: nextPunchType === 'out' ? '完成下班打卡' : '完成今日签到',
      description: completed
        ? '今日上下班打卡已完成'
        : nextPunchType === 'out'
          ? '下班前记得完成签退'
          : '上班前完成定位打卡',
      buttonText: completed ? '已完成' : '去打卡',
    };
  }

  if (role === 'foreman') {
    const missing = Number(foremanStatus?.missing || 0);
    const total = Number(foremanStatus?.totalWorkers || 0);
    const checkedIn = Number(foremanStatus?.checkedIn || 0);
    const completed = missing <= 0 && total > 0;

    return {
      visible: true,
      completed,
      title: '提醒班组签到',
      description: completed ? `${checkedIn}/${total} 人已完成签到` : `${missing} 人未签到，请及时跟进`,
      buttonText: completed ? '已完成' : '去查看',
    };
  }

  return {
    visible: false,
    completed: true,
    title: '',
    description: '',
    buttonText: '已完成',
  };
}

function formatDailyReportDescription(todo: BackendWorkbenchTodo) {
  const deadline = todo.deadline || todo.description || '';
  const timeMatch = String(deadline).match(/(\d{1,2}:\d{2})/);

  if (timeMatch) {
    return `今天 ${timeMatch[1]} 前`;
  }

  return '今天内完成提交';
}

function formatAttendanceDescription(todo: BackendWorkbenchTodo, role: WorkbenchTodoRole) {
  const description = String(todo.description || '');
  const countMatch = description.match(/(\d+)\s+workers?\s+have\s+not\s+punched\s+in/i);

  if (countMatch) {
    return `${countMatch[1]} 人未签到，请及时跟进`;
  }

  if (role === 'foreman') {
    return '请尽快查看班组签到情况';
  }

  return '请尽快完成今日签到';
}

function formatReimbursementDescription(todo: BackendWorkbenchTodo) {
  const description = String(todo.description || '');
  const amountMatch = description.match(/amount:\s*([\d,]+(?:\.\d+)?)/i);

  if (amountMatch) {
    return `金额：¥${amountMatch[1]}`;
  }

  return description || '请尽快审批报销申请';
}

export function normalizeWorkbenchTodo(
  todo: BackendWorkbenchTodo,
  role: WorkbenchTodoRole,
): WorkbenchTodoCard {
  const type = todo.type || 'default';

  if (type === 'daily_report') {
    return {
      id: todo.id,
      type,
      title: '提交今日施工日报',
      description: formatDailyReportDescription(todo),
      actionLabel: '去处理',
      actionUrl: todo.actionUrl || getTodoActionRoute('report', role),
      icon: 'report',
      priority: 'normal',
    };
  }

  if (type === 'attendance_reminder') {
    const isForemanReminder = role === 'foreman' || todo.actionUrl === '/foreman-attendance';

    return {
      id: todo.id,
      type,
      title: isForemanReminder ? '提醒班组签到' : '完成今日签到',
      description: formatAttendanceDescription(todo, role),
      actionLabel: isForemanReminder ? '去查看' : '去打卡',
      actionUrl: todo.actionUrl || getTodoActionRoute('sign-in', role),
      icon: 'attendance',
      priority: 'normal',
    };
  }

  if (type === 'reimbursement_approval') {
    return {
      id: todo.id,
      type,
      title: '审批报销申请',
      description: formatReimbursementDescription(todo),
      actionLabel: '去审批',
      actionUrl: todo.actionUrl || '/reimbursement',
      icon: 'reimbursement',
      priority: 'high',
    };
  }

  return {
    id: todo.id,
    type,
    title: todo.title || '待办事项',
    description: todo.description || '请尽快处理',
    actionLabel: '去处理',
    actionUrl: todo.actionUrl || '/workbench',
    icon: 'default',
    priority: todo.priority === 'high' ? 'high' : 'normal',
  };
}

export function normalizeWorkbenchTodos(
  todos: BackendWorkbenchTodo[] = [],
  role: WorkbenchTodoRole,
) {
  return todos
    .filter((todo) => !todo.status || todo.status === 'pending')
    .map((todo) => normalizeWorkbenchTodo(todo, role));
}
