import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position, PositionUpdate } from '../types';
import SummaryTable from './SummaryTable';
import { ChevronDownIcon } from './icons';

/**
 * @interface FinancialSummarySectionProps
 * @description Defines the props for the FinancialSummarySection component.
 */
interface FinancialSummarySectionProps {
  // Data for SummaryTable
  positions: Position[];
  onUpdatePosition: (positionUpdate: PositionUpdate) => void;
  onAddSubordinate: (managerId: string) => void;
  onEdit: (position: Position) => void;
  onDuplicate: (position: Position) => void;
  onDelete: (id: string) => void;
  isUnlocked: boolean;
  onUnlockRequest: () => void;

  // Financial Settings State & Handlers
  benefitsInput: string;
  setBenefitsInput: (value: string) => void;
  overheadInput: string;
  setOverheadInput: (value: string) => void;
  workWeekHoursInput: string;
  setWorkWeekHoursInput: (value: string) => void;
  globalRate: string;
  setGlobalRate: (value: string) => void;
  globalUtilization: string;
  setGlobalUtilization: (value: string) => void;
  handleApplyGlobalRate: () => void;
  handleApplyGlobalUtilization: () => void;
}

/**
 * @description A component that renders the "Financial Breakdown" section,
 * including a collapsible panel for global financial settings and the SummaryTable.
 */
const FinancialSummarySection: React.FC<FinancialSummarySectionProps> = ({
  positions,
  onUpdatePosition,
  onAddSubordinate,
  onEdit,
  onDuplicate,
  onDelete,
  isUnlocked,
  onUnlockRequest,
  benefitsInput,
  setBenefitsInput,
  overheadInput,
  setOverheadInput,
  workWeekHoursInput,
  setWorkWeekHoursInput,
  globalRate,
  setGlobalRate,
  globalUtilization,
  setGlobalUtilization,
  handleApplyGlobalRate,
  handleApplyGlobalUtilization,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Financial Breakdown</h2>
        <motion.button
          onClick={() => setIsSettingsOpen(prev => !prev)}
          aria-expanded={isSettingsOpen}
          aria-controls="financial-settings-panel"
          className="bg-brand-surface hover:bg-gray-800/60 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center border border-brand-border"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Settings
          <motion.div animate={{ rotate: isSettingsOpen ? 180 : 0 }}>
            <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" />
          </motion.div>
        </motion.button>
      </div>
      {/* Collapsible settings panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            id="financial-settings-panel"
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: '800px', opacity: 1, transition: { opacity: { duration: 0.3, delay: 0.1 } } }}
            exit={{ maxHeight: 0, opacity: 0, transition: { opacity: { duration: 0.2 } } }}
            className="overflow-hidden"
          >
            <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border mb-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Global Financial Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">

                {/* --- Multipliers --- */}
                <div>
                  <label htmlFor="benefits-percent" className="block text-sm font-medium text-gray-300">Total Salary Multiplier</label>
                  <p className="mt-1 text-xs text-gray-400">Accounts for benefits, taxes, etc.</p>
                  <div className="mt-2 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">Salary +</span>
                    <input type="number" id="benefits-percent" value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)} className="block w-full flex-1 rounded-none bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="overhead-percent" className="block text-sm font-medium text-gray-300">Overhead Cost Multiplier</label>
                  <p className="mt-1 text-xs text-gray-400">Accounts for rent, software, etc.</p>
                  <div className="mt-2 flex rounded-md shadow-sm">
                    <input type="number" id="overhead-percent" value={overheadInput} onChange={e => setOverheadInput(e.target.value)} className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">% of Total Salary</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="work-week-hours" className="block text-sm font-medium text-gray-300">Work Week (Hours)</label>
                  <p className="mt-1 text-xs text-gray-400">Affects Revenue totals.</p>
                  <div className="mt-2 flex rounded-md shadow-sm">
                    <input type="number" id="work-week-hours" value={workWeekHoursInput} onChange={e => setWorkWeekHoursInput(e.target.value)} className="block w-full flex-1 rounded-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                  </div>
                </div>

                {/* --- Global Overwrites --- */}
                <div className="md:col-span-2 lg:col-span-3 border-t border-brand-border pt-6 mt-2">
                  <h4 className="text-md font-semibold mb-3 text-white">Global Overwrites</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label htmlFor="global-rate" className="block text-sm font-medium text-gray-300">Global Rate ($/hr)</label>
                      <p className="mt-1 text-xs text-gray-400">Applies a single rate to all billable roles.</p>
                      <div className="mt-2 flex">
                        <input type="number" id="global-rate" value={globalRate} onChange={e => setGlobalRate(e.target.value)} placeholder="e.g., 200" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                        <button onClick={handleApplyGlobalRate} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalRate}>Apply</button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="global-utilization" className="block text-sm font-medium text-gray-300">Global Utilization (%)</label>
                      <p className="mt-1 text-xs text-gray-400">Applies a single utilization to all billable roles.</p>
                      <div className="mt-2 flex">
                        <input type="number" id="global-utilization" value={globalUtilization} onChange={e => setGlobalUtilization(e.target.value)} placeholder="e.g., 80" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                        <button onClick={handleApplyGlobalUtilization} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalUtilization}>Apply</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SummaryTable
        positions={positions}
        onUpdatePosition={onUpdatePosition}
        onAddSubordinate={onAddSubordinate}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        isUnlocked={isUnlocked}
        onUnlockRequest={onUnlockRequest}
      />
    </div>
  );
};

export default FinancialSummarySection;