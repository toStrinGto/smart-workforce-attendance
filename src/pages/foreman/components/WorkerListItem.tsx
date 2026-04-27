import React from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Worker } from '@/types/models';

interface Props {
  worker: Worker;
  isSelected: boolean;
  overtime: number;
  submittedRecord?: { dayShift: number; overtime: number };
  onToggle: (id: number) => void;
  onOvertimeChange: (id: number, overtime: number) => void;
}

export const WorkerListItem: React.FC<Props> = ({ worker, isSelected, overtime, submittedRecord, onToggle, onOvertimeChange }) => {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl p-3 flex flex-col border transition-all",
        isSelected ? "border-orange-500 shadow-sm" : "border-gray-100",
        submittedRecord && !isSelected ? "bg-emerald-50/30 border-emerald-100" : ""
      )}
    >
      <div className="flex items-center cursor-pointer" onClick={() => onToggle(worker.id)}>
        <div className={cn(
          "w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors",
          isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"
        )}>
          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
        
        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold mr-3">
          {worker.avatar}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-800">{worker.name}</div>
            {submittedRecord && !isSelected && (
              <div className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                已记: {submittedRecord.dayShift}天 {submittedRecord.overtime > 0 ? `+ ${submittedRecord.overtime}h` : ''}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">{worker.role}</div>
        </div>
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">加班时长 (小时)</span>
          <div className="flex items-center space-x-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOvertimeChange(worker.id, Math.max(0, overtime - 0.5));
              }}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-bold w-6 text-center">{overtime}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOvertimeChange(worker.id, Math.min(24, overtime + 0.5));
              }}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

