import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronLeft, Briefcase, Calculator, Users, FileText, Loader2, Check, ChevronsUpDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { foremanApi } from '@/services/foreman';
import { Project, Worker } from '@/types/models';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { request } from '@/lib/api';
import { normalizeProjectCostResponse } from './projectCostData';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AttendanceRecord {
  workerId: number;
  date: string;
  dayShift: number;
  overtimeHours: number;
}

interface ReimbursementRecord {
  id: number;
  amount: number;
  description: string;
  date: string;
}

export default function BossProjectCost() {
  usePageTitle('项目成本');
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // Mock data for attendance and reimbursements
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, workersRes] = await Promise.all([
          foremanApi.getProjects(),
          foremanApi.getWorkers()
        ]);
        setProjects(projectsRes.data);
        setWorkers(workersRes.data);

        if (projectsRes.data.length > 0) {
          setSelectedProjectId(projectsRes.data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch cost data when project changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchCostData = async () => {
      try {
        const res = await request(`/api/v1/boss/project-cost?projectId=${selectedProjectId}`);
        if (res.code === 200) {
          const projectData = normalizeProjectCostResponse(res.data, selectedProjectId);
          setAttendance(projectData.attendance);
          setReimbursements(projectData.reimbursements);
          setWorkers(prev => {
            const merged = [...prev];

            projectData.workers.forEach((costWorker) => {
              const index = merged.findIndex((worker) => worker.id === costWorker.id);
              if (index >= 0) {
                merged[index] = { ...merged[index], ...costWorker };
              } else {
                merged.push(costWorker);
              }
            });

            return merged;
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCostData();
  }, [selectedProjectId]);

  const { laborCost, reimbursementCost, totalCost, workerCosts } = useMemo(() => {
    let laborCost = 0;
    const workerCostsMap: Record<number, { name: string; cost: number; days: number; overtime: number }> = {};

    attendance.forEach(record => {
      const worker = workers.find(w => w.id === record.workerId);
      if (worker && worker.dailyWage) {
        const cost = (record.dayShift + record.overtimeHours / 6) * worker.dailyWage;
        laborCost += cost;
        
        if (!workerCostsMap[worker.id]) {
          workerCostsMap[worker.id] = { name: worker.name, cost: 0, days: 0, overtime: 0 };
        }
        workerCostsMap[worker.id].cost += cost;
        workerCostsMap[worker.id].days += record.dayShift;
        workerCostsMap[worker.id].overtime += record.overtimeHours;
      }
    });

    const reimbursementCost = reimbursements.reduce((sum, r) => sum + r.amount, 0);
    const totalCost = laborCost + reimbursementCost;

    return { 
      laborCost, 
      reimbursementCost, 
      totalCost,
      workerCosts: Object.values(workerCostsMap).sort((a, b) => b.cost - a.cost)
    };
  }, [attendance, reimbursements, workers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 relative">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 active:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">项目成本统计</h1>
          <div className="w-6" />
        </div>
        
        {/* Project Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full justify-between h-12 bg-gray-100 border-transparent hover:bg-gray-200 hover:text-gray-900 text-gray-800 font-bold rounded-xl"
            )}
            role="combobox"
            aria-expanded={open}
          >
            <div className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-blue-500" />
              {selectedProjectId
                ? projects.find((p) => p.id === selectedProjectId)?.name
                : "选择项目..."}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-32px)] p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索项目..." />
              <CommandList>
                <CommandEmpty>未找到项目</CommandEmpty>
                <CommandGroup>
                  {projects.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        setSelectedProjectId(p.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProjectId === p.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Total Cost Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-200" />
                <span className="text-sm font-medium text-blue-100">项目总成本</span>
              </div>
            </div>
            <div className="text-3xl font-bold mb-6">¥ {totalCost.toFixed(2)}</div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-500/30">
              <div>
                <div className="text-xs text-blue-200 mb-1">人工成本</div>
                <div className="text-lg font-bold">¥ {laborCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-blue-200 mb-1">报销成本</div>
                <div className="text-lg font-bold">¥ {reimbursementCost.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labor Cost Details */}
        <div 
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            const project = projects.find(p => p.id === selectedProjectId);
            if (project) {
              navigate(`/project-attendance/${project.name}`);
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <Users className="w-5 h-5 text-indigo-500 mr-2" />
              人工成本明细
            </h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          {workerCosts.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">暂无人工成本记录</div>
          ) : (
            <div className="space-y-3">
              {workerCosts.map((wc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{wc.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      出勤: {wc.days}天 | 加班: {wc.overtime}小时
                    </div>
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    ¥ {wc.cost.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reimbursement Details */}
        <div 
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            const project = projects.find(p => p.id === selectedProjectId);
            if (project) {
              navigate(`/boss/reimbursement-project/${project.name}`);
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 text-emerald-500 mr-2" />
              报销成本明细
            </h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          {reimbursements.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">暂无报销记录</div>
          ) : (
            <div className="space-y-3">
              {reimbursements.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{r.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{r.date}</div>
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    ¥ {r.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
