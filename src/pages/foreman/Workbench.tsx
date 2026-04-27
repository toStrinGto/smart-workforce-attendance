import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Briefcase, CheckCircle2, Loader2, Minus, Plus, Users } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForemanWorkbench } from '@/hooks/useForeman';
import { Card, CardContent } from '@/components/ui/Card';
import { List } from '@/components/ui/List';
import { Button } from '@/components/ui/OldButton';
import { logger } from '@/lib/logger';
import { Project } from '@/types/models';
import { ProjectSelectorModal } from './components/ProjectSelectorModal';
import { WorkerListItem } from './components/WorkerListItem';

export default function ForemanWorkbench() {
  usePageTitle('批量记工');
  const { projects, workers, submittedRecords, loading, error, submitAttendance, fetchProjectData, refetch } = useForemanWorkbench();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]);
  const [dayShift, setDayShift] = useState(1);
  const [globalOvertime, setGlobalOvertime] = useState(0);
  const [overtimeMap, setOvertimeMap] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      const firstProject = projects[0];
      setSelectedProject(firstProject);
      fetchProjectData(firstProject.id);
    }
  }, [projects, selectedProject, fetchProjectData]);

  const toggleWorker = (id: number) => {
    setSelectedWorkers((prev) => {
      if (prev.includes(id)) {
        return prev.filter((workerId) => workerId !== id);
      }

      return [...prev, id];
    });

    if (!selectedWorkers.includes(id)) {
      setOvertimeMap((prev) => ({ ...prev, [id]: globalOvertime }));
    }
  };

  const handleOvertimeChange = (id: number, overtime: number) => {
    setOvertimeMap((prev) => ({ ...prev, [id]: overtime }));
  };

  const handleGlobalOvertimeChange = (newOvertime: number) => {
    setGlobalOvertime(newOvertime);
    setOvertimeMap((prev) => {
      const next = { ...prev };
      selectedWorkers.forEach((id) => {
        next[id] = newOvertime;
      });
      return next;
    });
  };

  const selectAll = () => {
    if (selectedWorkers.length === workers.length) {
      setSelectedWorkers([]);
      return;
    }

    const allIds = workers.map((worker) => worker.id);
    setSelectedWorkers(allIds);

    setOvertimeMap((prev) => {
      const next = { ...prev };
      allIds.forEach((id) => {
        if (!selectedWorkers.includes(id)) {
          next[id] = globalOvertime;
        }
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedWorkers.length === 0 || !selectedProject) return;

    try {
      setIsSubmitting(true);
      const records = selectedWorkers.map((workerId) => ({
        workerId,
        dayShift,
        overtimeHours: overtimeMap[workerId] || 0,
      }));

      await submitAttendance({
        projectId: selectedProject.id,
        records,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedWorkers([]);
        setDayShift(1);
        setGlobalOvertime(0);
        setOvertimeMap({});
      }, 2000);
    } catch (error) {
      logger.error('Failed to submit attendance', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !selectedProject) {
    if (!loading && !selectedProject && projects.length === 0) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center bg-gray-50 p-6">
          <AlertCircle className="mb-3 h-12 w-12 text-gray-300" />
          <p className="mb-4 text-sm text-gray-500">{error || '暂无项目数据'}</p>
          <button
            onClick={refetch}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white"
          >
            重试
          </button>
        </div>
      );
    }
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col bg-gray-50 md:h-auto md:min-h-full md:pb-0">
      <div className="relative z-10 bg-white px-4 pb-4 pt-12 shadow-sm md:pt-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-center text-lg font-bold text-gray-800 md:text-left md:text-2xl">批量记工</h1>

          <Card
            onClick={() => setShowProjectModal(true)}
            className="cursor-pointer bg-gray-50 transition-colors hover:bg-gray-100"
          >
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm font-bold text-gray-800 md:text-base">{selectedProject.name}</div>
                  <div className="text-xs text-gray-500 md:text-sm">
                    {selectedProject.team} (共{selectedProject.count}人)
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-500">切换</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col md:flex-row md:gap-6 md:overflow-hidden md:p-6">
        <div className="flex min-h-0 flex-1 flex-col md:rounded-2xl md:border md:border-gray-100 md:bg-white md:p-4 md:shadow-sm">
          <div className="shrink-0 px-4 py-3 md:mb-4 md:px-0 md:py-0">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center text-sm font-bold text-gray-800 md:text-base">
                <Users className="mr-1.5 h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                选择工人 ({selectedWorkers.length}/{workers.length})
              </h3>
              <button
                onClick={selectAll}
                className="text-xs font-medium text-orange-500 hover:text-orange-600 md:text-sm"
              >
                {selectedWorkers.length === workers.length ? '取消全选' : '全选'}
              </button>
            </div>
            {error && (
              <div className="mt-3 flex items-start rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-52 md:px-0 md:pb-0">
            <List>
              {workers.map((worker) => (
                <WorkerListItem
                  key={worker.id}
                  worker={worker}
                  isSelected={selectedWorkers.includes(worker.id)}
                  overtime={overtimeMap[worker.id] || 0}
                  submittedRecord={submittedRecords[worker.id]}
                  onToggle={toggleWorker}
                  onOvertimeChange={handleOvertimeChange}
                />
              ))}
            </List>
          </div>
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-20 rounded-t-3xl bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:relative md:bottom-auto md:left-auto md:right-auto md:h-fit md:w-80 md:rounded-2xl md:border md:border-gray-100 md:shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-800">白班 (个)</div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDayShift(Math.max(0, dayShift - 0.5))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-lg font-bold">{dayShift}</span>
              <button
                onClick={() => setDayShift(dayShift + 0.5)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-800">加班 (小时)</div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleGlobalOvertimeChange(Math.max(0, globalOvertime - 0.5))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-lg font-bold">{globalOvertime}</span>
              <button
                onClick={() => handleGlobalOvertimeChange(Math.min(24, globalOvertime + 0.5))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={selectedWorkers.length === 0}
            isLoading={isSubmitting}
            className="w-full"
            size="lg"
          >
            确认记工 ({selectedWorkers.length}人)
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-1/2 z-50 flex -translate-x-1/2 items-center space-x-2 rounded-full bg-gray-900 px-6 py-3 text-white shadow-lg md:bottom-10"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">记工成功</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectSelectorModal
        isOpen={showProjectModal}
        projects={projects}
        selectedProject={selectedProject}
        onClose={() => setShowProjectModal(false)}
        onSelect={(project) => {
          setSelectedProject(project);
          setShowProjectModal(false);
          setSelectedWorkers([]);
          setOvertimeMap({});
          fetchProjectData(project.id);
        }}
      />
    </div>
  );
}
