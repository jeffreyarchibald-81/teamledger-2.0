import React from 'react';
import { motion } from 'framer-motion';
import { Position } from '../types';
import { UserPlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from './icons';
import { formatCurrency } from '../utils/financialUtils';

/**
 * @interface PositionCardProps
 * @description Defines the props for the PositionCard component.
 */
interface PositionCardProps {
  /** The position data to display on the card. */
  position: Position;
  /** Callback function triggered when the "add subordinate" button is clicked. */
  onAddSubordinate: () => void;
  /** Callback function triggered when the "edit" button is clicked. */
  onEdit: () => void;
  /** Callback function triggered when the "delete" button is clicked. */
  onDelete: () => void;
  /** Callback function triggered when the "duplicate" button is clicked. */
  onDuplicate: () => void;
}

/**
 * @description A visual component that displays the details of a single position in the org chart.
 * It includes the role title, key financial metrics, and action buttons (add, edit, delete, duplicate).
 */
const PositionCard: React.FC<PositionCardProps> = ({ position, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  // Determine the color for financial metrics based on whether the margin is positive or negative.
  const marginColor = position.margin >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <motion.div 
        className="card-gradient p-2 rounded-lg shadow-soft-glow transition-shadow border border-brand-border"
        whileHover={{ scale: 1.03, y: -4, boxShadow: '0 15px 30px -15px rgba(0, 0, 0, 0.3), 0 0 25px 0 rgba(34, 211, 238, 0.08)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="text-sm font-bold text-white text-left">{position.role}</h3>
          <div className="text-xs text-gray-300 mt-1 text-left space-y-1">
            {position.roleType === 'nonBillable' && <span className="text-[10px] font-bold tracking-wider text-gray-400 block mb-1">NON-BILLABLE</span>}
            <p>Salary: <span className="font-semibold text-gray-300">{formatCurrency(position.salary)}</span></p>
            <p>Profit: <span className={`font-semibold ${marginColor}`}>{formatCurrency(position.profit)}</span></p>
            <p>Margin: <span className={`font-semibold ${marginColor}`}>{position.margin.toFixed(0)}%</span></p>
          </div>
        </div>
        {/* Action buttons for manipulating the position */}
        <div className="flex flex-col space-y-1 ml-2">
            <button onClick={onAddSubordinate} aria-label={`Add report to ${position.role}`} className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <UserPlusIcon className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={onEdit} aria-label={`Edit ${position.role}`} className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <PencilIcon className="w-4 h-4 text-gray-300" />
            </button>
             <button onClick={onDuplicate} aria-label={`Duplicate ${position.role}`} className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <DocumentDuplicateIcon className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={onDelete} aria-label={`Delete ${position.role}`} className="p-1.5 rounded-full hover:bg-red-500/20 transition-colors">
                <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PositionCard;