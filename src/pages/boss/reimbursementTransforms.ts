import { AmountValue, formatAmount } from './formatAmount';

export type ReimbursementStatus = 'pending' | 'approved' | 'rejected';
export type ReimbursementTimeFilter = 'month' | 'quarter' | 'year' | 'all';

interface ProjectReimbursementSummary {
  totalAmount: AmountValue;
  pendingAmount: AmountValue;
  approvedAmount: AmountValue;
}

interface ProjectReimbursementCategory {
  name: string;
  amount: AmountValue;
  percent?: number;
}

interface ProjectReimbursementRecord {
  id: string;
  applicant: string;
  category: string;
  amount: AmountValue;
  date: string;
  status: string;
  reason?: string;
  images?: string[];
}

export interface ProjectReimbursementData {
  projectName: string;
  summary: ProjectReimbursementSummary;
  categories: ProjectReimbursementCategory[];
  recentRecords: ProjectReimbursementRecord[];
}

export interface ProjectReimbursementDisplayData {
  projectName: string;
  summary: {
    totalAmount: string;
    pendingAmount: string;
    approvedAmount: string;
  };
  categories: Array<{
    name: string;
    amount: string;
    percent: number;
    percentLabel: string;
  }>;
  recentRecords: Array<{
    id: string;
    applicant: string;
    category: string;
    amount: string;
    date: string;
    status: ReimbursementStatus;
    reason?: string;
    images?: string[];
  }>;
}

export interface ReimbursementOverviewData {
  summary: {
    totalAmount: AmountValue;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
  };
  projects: Array<{
    id: string | number;
    name: string;
    totalAmount: AmountValue;
    pendingCount: number;
    approvedCount: number;
    percent?: number;
  }>;
}

function parseAmount(value: AmountValue) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getScale(filter: ReimbursementTimeFilter) {
  if (filter === 'month') return 0.2;
  if (filter === 'quarter') return 0.5;
  if (filter === 'year') return 0.8;
  return 1;
}

function roundPercent(percent: number) {
  if (percent > 0 && percent < 1) {
    return Number(percent.toFixed(1));
  }

  return Math.round(percent);
}

function formatPercentLabel(percent: number) {
  if (percent > 0 && percent < 1) {
    return `${percent.toFixed(1)}%`;
  }

  return `${Math.round(percent)}%`;
}

export function normalizeReimbursementStatus(status: string): ReimbursementStatus {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'pending' || normalized === '待审批' || normalized === '待审核') {
    return 'pending';
  }

  if (normalized === 'approved' || normalized === '已批准' || normalized === '已通过') {
    return 'approved';
  }

  if (normalized === 'rejected' || normalized === '已驳回') {
    return 'rejected';
  }

  return 'pending';
}

export function buildProjectReimbursementDisplayData(
  allData: ProjectReimbursementData | null,
  timeFilter: ReimbursementTimeFilter,
): ProjectReimbursementDisplayData | null {
  if (!allData) return null;

  const scale = getScale(timeFilter);
  const totalAmount = parseAmount(allData.summary.totalAmount) * scale;
  const pendingAmount = parseAmount(allData.summary.pendingAmount) * scale;
  const approvedAmount = parseAmount(allData.summary.approvedAmount) * scale;

  return {
    projectName: allData.projectName,
    summary: {
      totalAmount: formatAmount(totalAmount),
      pendingAmount: formatAmount(pendingAmount),
      approvedAmount: formatAmount(approvedAmount),
    },
    categories: allData.categories.map((category) => {
      const amount = parseAmount(category.amount) * scale;
      const rawPercent = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      const percent = roundPercent(rawPercent);

      return {
        name: category.name,
        amount: formatAmount(amount),
        percent,
        percentLabel: formatPercentLabel(rawPercent),
      };
    }),
    recentRecords: allData.recentRecords.map((record) => ({
      ...record,
      amount: formatAmount(parseAmount(record.amount) * scale),
      status: normalizeReimbursementStatus(record.status),
    })),
  };
}

export function buildReimbursementOverviewDisplayData(
  allData: ReimbursementOverviewData | null,
  timeFilter: ReimbursementTimeFilter,
) {
  if (!allData) return null;

  const scale = getScale(timeFilter);
  const totalAmount = parseAmount(allData.summary.totalAmount) * scale;

  return {
    summary: {
      totalAmount: formatAmount(totalAmount),
      pendingCount: Math.ceil(allData.summary.pendingCount * scale),
      approvedCount: Math.ceil(allData.summary.approvedCount * scale),
      rejectedCount: Math.ceil(allData.summary.rejectedCount * scale),
    },
    projects: allData.projects.map((project) => {
      const projectAmount = parseAmount(project.totalAmount) * scale;
      const percent = totalAmount > 0 ? Math.round((projectAmount / totalAmount) * 100) : 0;

      return {
        ...project,
        totalAmount: formatAmount(projectAmount),
        pendingCount: Math.ceil(project.pendingCount * scale),
        approvedCount: Math.ceil(project.approvedCount * scale),
        percent,
      };
    }),
  };
}
