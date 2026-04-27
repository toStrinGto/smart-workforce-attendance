import React from 'react';
import { CheckCircle2, Briefcase, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Project } from '@/types/models';

interface Props {
  isOpen: boolean;
  projects: Project[];
  selectedProject: Project | null;
  onClose: () => void;
  onSelect: (project: Project) => void;
}

export const ProjectSelectorModal: React.FC<Props> = ({ isOpen, projects, selectedProject, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-[101] pb-safe"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">切换项目/班组</h3>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 active:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onSelect(project)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer",
                    selectedProject?.id === project.id 
                      ? "border-orange-500 bg-orange-50/50" 
                      : "border-gray-100 bg-white active:bg-gray-50"
                  )}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mr-3",
                      selectedProject?.id === project.id ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
                    )}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{project.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{project.team} (共{project.count}人)</div>
                    </div>
                  </div>
                  {selectedProject?.id === project.id && (
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
