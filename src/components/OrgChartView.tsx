import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreeNode, Position } from '../types';
import OrgChart from './OrgChart';
import OrgChartListView from './OrgChartListView';
import {
  PlusIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  XIcon,
  UserPlusIcon, // Added for icon description
  PencilIcon, // Added for icon description
  TrashIcon, // Added for icon description
} from './icons';
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { backdropVariants, modalVariants } from '../utils/motionVariants';

/**
 * @interface OrgChartViewProps
 * @description Defines the props for the OrgChartView component.
 */
interface OrgChartViewProps {
  /** The hierarchical data structure representing the organizational chart. */
  tree: TreeNode[];
  /** Callback function to open the editor for a new subordinate. */
  onAddSubordinate: (managerId: string | null) => void;
  /** Callback function to edit an existing position. */
  onEdit: (position: Position) => void;
  /** Callback function to delete a position. */
  onDelete: (id: string) => void;
  /** Callback function to duplicate a position. */
  onDuplicate: (position: Position) => void;
  /** Flag indicating if the current data is sample data. */
  isShowingSampleData: boolean;
  /** Flag controlling the visibility of the sample data notice. */
  isSampleNoticeVisible: boolean;
  /** Function to set the visibility of the sample data notice. */
  setIsSampleNoticeVisible: (visible: boolean) => void;
  /** Callback to add a root-level role when the chart is empty. */
  handleAddRootRole: () => void;
  /** Callback to open the confirm delete all modal. */
  setIsDeleteAllConfirmOpen: (isOpen: boolean) => void;
  /** Ref to capture the DOM element for export functionality (e.g., PNG download). */
  captureRef: React.RefObject<HTMLDivElement>;
}

/**
 * @description A modal component that displays help information for the Org Chart section.
 * Fix: This component was previously in its own file (`HelpModal.tsx`) but is now
 * embedded directly into `OrgChartView.tsx` as per the instruction in the original file.
 */
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isShowingSampleData: boolean;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isShowingSampleData }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useAccessibilityModal(isOpen, onClose, modalRef);

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-2xl"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 id="help-modal-title" className="text-xl font-bold text-white">How to Use TeamLedger</h3> {/* Updated Title */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
              aria-label="Close help modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4 text-gray-300">
            {isShowingSampleData && (
              <div className="bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm max-w-full shadow-lg backdrop-blur-sm mb-6">
                <p className="font-semibold">You're currently viewing a sample org chart.</p>
                <p className="mt-1">
                  Feel free to edit these roles, or use the "Actions" menu to delete them all and start fresh.
                </p>
              </div>
            )}
            <ul className="list-disc list-inside space-y-3 text-base"> {/* Adjusted font size and spacing for readability */}
              <li>
                <span className="font-bold">Build your chart:</span> Use the <UserPlusIcon className="inline-block w-4 h-4 align-text-bottom" /> <PencilIcon className="inline-block w-4 h-4 align-text-bottom" /> and <TrashIcon className="inline-block w-4 h-4 align-text-bottom" /> icons on each card to add, edit, or delete roles. The "Actions" menu also allows you to add roles and clear the chart.
              </li>
              <li>
                <span className="font-bold">Change views:</span> Toggle between the "Tree" and "List" views to see your structure differently.
              </li>
              <li>
                <span className="font-bold">Quick edits:</span> Click on any Role, Salary, Rate, or Utilization value in the Financial Breakdown table to edit it directly.
              </li>
              <li>
                <span className="font-bold">Global settings:</span> Adjust the company-wide multipliers for benefits and overhead in the "Settings" section.
              </li>
              <li>
                <span className="font-bold">Export & Share:</span> Use the "Actions" menu to get a shareable link or download your data as a PNG or CSV.
              </li>
              <li>
                <span className="font-bold">Get insights:</span> Use the AI Analysis section to get a strategic overview of your team structure.
              </li>
            </ul>
          </div>
        </div>
        <div className="bg-gray-900/50 px-6 py-4 flex justify-end rounded-b-lg">
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Got it!
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};


/**
 * @description A component that renders the organizational structure section,
 * including a view switcher for Tree/List display, a sample data notice,
 * and handles interactions for adding, editing, and deleting positions.
 */
const OrgChartView: React.FC<OrgChartViewProps> = ({
  tree,
  onAddSubordinate,
  onEdit,
  onDelete,
  onDuplicate,
  isShowingSampleData,
  isSampleNoticeVisible,
  setIsSampleNoticeVisible,
  handleAddRootRole,
  setIsDeleteAllConfirmOpen,
  captureRef,
}) => {
  const [chartView, setChartView] = useState<'tree' | 'list'>('tree');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold">Organizational Structure</h2>
          {/* View switcher: Tree vs. List */}
          <div role="tablist" aria-label="Chart view" className="flex items-center rounded-lg bg-brand-surface p-1 border border-brand-border">
            <button role="tab" aria-selected={chartView === 'tree'} onClick={() => setChartView('tree')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'tree' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>Tree</button>
            <button role="tab" aria-selected={chartView === 'list'} onClick={() => setChartView('list')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'list' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>List</button>
          </div>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="How to use this section"
        >
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-border overflow-x-auto relative min-h-[200px]">
        {isShowingSampleData && isSampleNoticeVisible && (
          <div className="absolute top-5 right-5 bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm max-w-xs shadow-lg backdrop-blur-sm z-10">
            <button
              onClick={() => setIsSampleNoticeVisible(false)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-800 hover:bg-yellow-700 transition-colors"
              aria-label="Dismiss notice"
            >
              <XIcon className="w-4 h-4 text-yellow-200" />
            </button>
            <p>
              This is a sample org chart. Customize it, or{' '}
              <button
                onClick={() => setIsDeleteAllConfirmOpen(true)}
                className="font-semibold underline hover:text-white transition-colors"
              >
                delete it to start from scratch
              </button>
              .
            </p>
          </div>
        )}
        {/* Animated switch between Tree and List views */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chartView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tree.length > 0 ? (
              <>
                {chartView === 'tree' ? (
                  <OrgChart
                    tree={tree}
                    onAddSubordinate={onAddSubordinate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    captureRef={captureRef}
                  />
                ) : (
                  <OrgChartListView
                    tree={tree}
                    onAddSubordinate={onAddSubordinate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                  />
                )}
              </>
            ) : (
              // Empty state for the org chart
              <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                <InformationCircleIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white">Your organizational chart is empty.</h3>
                <p className="mt-2 max-w-sm">Create your first position to get started. A CEO or Founder is a great place to begin.</p>
                <motion.button
                  onClick={() => onAddSubordinate(null)} // Add root role directly from here
                  className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-5 rounded-lg transition-colors duration-200 flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add First Role
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <HelpModal
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
            isShowingSampleData={isShowingSampleData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrgChartView;