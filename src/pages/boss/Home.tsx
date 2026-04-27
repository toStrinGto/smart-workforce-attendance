/**
 * Home.tsx
 * 老板 (Boss) 角色的首页/仪表盘。
 * 提供公司整体运营数据的宏观视图，包括总收入、总支出、活跃项目数等，并展示关键业务概览。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  AlertCircle,
  Banknote,
  Building2,
  Calculator,
  CheckCircle,
  ChevronRight,
  FileText,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { request } from '@/lib/api';
import { AmountValue, formatAmount, formatCompactAmount } from './formatAmount';

interface DashboardData {
  briefing: {
    incomeContract: AmountValue;
    incomeSettlement: AmountValue;
    collectionAmount: AmountValue;
    invoiceAmount: AmountValue;
  };
  projects: {
    activeCount: number;
    invoicedUncollected: AmountValue;
    paidUninvoiced: AmountValue;
    pendingRepayment: AmountValue;
  };
  reimbursements: Array<{
    name: string;
    amount: AmountValue;
    count: number;
    percent: number;
  }>;
}

export default function BossHome() {
  usePageTitle('经营首页');
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const json = await request<DashboardData>('/api/v1/dashboard/boss');
        if (json.code === 200) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-gray-50 pb-4">
      <div className="rounded-b-3xl bg-gradient-to-br from-gray-900 to-gray-800 px-4 pb-10 pt-12 text-white shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">企业看板</h1>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <span className="font-bold">老</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">欢迎回来，随时掌握企业动态</p>
      </div>

      <div className="relative z-10 -mt-6 space-y-4 px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center text-base font-bold text-gray-800">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
            数据简报 (本年度)
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-50 p-3 animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => navigate('/boss/contracts?tab=income')}
                className="cursor-pointer rounded-xl border border-blue-100/50 bg-blue-50/50 p-3 transition-transform active:scale-95"
              >
                <div className="mb-1 text-xs text-gray-500">收入合同</div>
                <div className="text-lg font-bold text-gray-800">¥ {formatCompactAmount(data.briefing.incomeContract)}</div>
              </div>
              <div
                onClick={() => navigate('/boss/income-settlement')}
                className="cursor-pointer rounded-xl border border-emerald-100/50 bg-emerald-50/50 p-3 transition-transform active:scale-95"
              >
                <div className="mb-1 text-xs text-gray-500">收入结算</div>
                <div className="text-lg font-bold text-gray-800">¥ {formatCompactAmount(data.briefing.incomeSettlement)}</div>
              </div>
              <div className="rounded-xl border border-orange-100/50 bg-orange-50/50 p-3">
                <div className="mb-1 text-xs text-gray-500">收款金额</div>
                <div className="text-lg font-bold text-gray-800">¥ {formatCompactAmount(data.briefing.collectionAmount)}</div>
              </div>
              <div className="rounded-xl border border-purple-100/50 bg-purple-50/50 p-3">
                <div className="mb-1 text-xs text-gray-500">开票金额</div>
                <div className="text-lg font-bold text-gray-800">¥ {formatCompactAmount(data.briefing.invoiceAmount)}</div>
              </div>
              <div
                onClick={() => navigate('/boss/project-cost')}
                className="col-span-2 cursor-pointer rounded-xl border border-indigo-100/50 bg-indigo-50/50 p-3 transition-transform active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center text-xs text-gray-500">
                      <Calculator className="mr-1 h-3.5 w-3.5 text-indigo-500" />
                      项目成本
                    </div>
                    <div className="text-lg font-bold text-gray-800">查看详情</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center text-base font-bold text-gray-800">
            <Building2 className="mr-2 h-5 w-5 text-indigo-500" />
            项目情况
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-50" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-3">
              <div
                onClick={() => navigate('/boss/projects?status=施工中')}
                className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-3 transition-transform active:scale-[0.98] hover:bg-gray-100"
              >
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">进行中的项目</span>
                </div>
                <span className="text-base font-bold text-gray-900">{data.projects.activeCount} 个</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">合同已开票未收款</span>
                </div>
                <span className="text-base font-bold text-amber-600">¥ {formatAmount(data.projects.invoicedUncollected)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">合同已付款未收票</span>
                </div>
                <span className="text-base font-bold text-rose-600">¥ {formatAmount(data.projects.paidUninvoiced)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">待还款</span>
                </div>
                <span className="text-base font-bold text-red-600">¥ {formatAmount(data.projects.pendingRepayment)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div
          onClick={() => navigate('/boss/reimbursement-overview')}
          className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center text-base font-bold text-gray-800">
              <Banknote className="mr-2 h-5 w-5 text-emerald-500" />
              各项目报销情况 (本月)
            </h2>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="space-y-4">
              {data.reimbursements.map((project, idx) => (
                <div key={idx} className="relative">
                  <div className="mb-1 flex items-end justify-between">
                    <div className="text-sm font-medium text-gray-800">{project.name}</div>
                    <div className="text-sm font-bold text-gray-900">¥ {formatAmount(project.amount)}</div>
                  </div>
                  <div className="mb-2 text-xs text-gray-500">{project.count} 笔待审核/已报销</div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.percent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
