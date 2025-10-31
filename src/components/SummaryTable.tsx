import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position, PositionUpdate } from '../types';
import { SparklesIcon, EllipsisVerticalIcon, UserPlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from './icons';
import { formatCurrency, formatPercent } from '../utils/financialUtils';

/** Defines the fields that are editable directly within the summary table. */
type EditableField = 'role' | 'salary' | 'rate' | 'utilization';

/**
 * @interface SummaryTableProps
 * @description Defines the props for the SummaryTable component.
 */
interface SummaryTableProps {
    /** The array of all positions to display in the table. */
    positions: Position[];
    /** Callback to update a position's data. */
    onUpdatePosition: (positionUpdate: PositionUpdate) => void;
    /** Callback to open the editor to add a subordinate. */
    onAddSubordinate: (managerId: string) => void;
    /** Callback to open the editor to edit a position. */
    onEdit: (position: Position) => void;
    /** Callback to duplicate a position. */
    onDuplicate: (position: Position) => void;
    /** Callback to delete a position. */
    onDelete: (id: string) => void;
    /** Flag indicating if premium features are unlocked. */
    isUnlocked: boolean;
    /** Callback to trigger the unlock modal. */
    onUnlockRequest: () => void;
}

/**
 * @description Renders a comprehensive table summarizing all financial data for every position.
 * It features in-line editing for key fields and provides access to actions for each role.
 * A totals row, which is a premium feature, is displayed at the bottom.
 */
const SummaryTable: React.FC<SummaryTableProps> = ({ positions, onUpdatePosition, onAddSubordinate, onEdit, onDuplicate, onDelete, isUnlocked, onUnlockRequest }) => {
  // State to manage which cell is currently being edited in-line.
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  // State to control the visibility of the actions dropdown menu for each row.
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Effect to handle closing the actions menu when clicking outside of it. */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenu(null);
        }
    };
    if (activeMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  /** Puts a cell into edit mode. */
  const handleEdit = (pos: Position, field: EditableField) => {
    // Prevent editing of rate/utilization for non-billable roles.
    if (pos.roleType === 'nonBillable' && (field === 'rate' || field === 'utilization')) {
        return;
    }
    
    setEditingCell({ id: pos.id, field });
    setEditValue(String(pos[field]));
  };

  /** Saves the value from the in-line editor and exits edit mode. */
  const handleSave = () => {
    if (!editingCell) return;
    
    const { id, field } = editingCell;
    const position = positions.find(p => p.id === id);
    if (!position) return;
  
    const newValue = field === 'role' ? editValue : parseFloat(editValue) || 0;
    
    // Only call the update function if the value has actually changed.
    if (position[field] !== newValue) {
        const updatePayload: PositionUpdate = { ...position, [field]: newValue };
        onUpdatePosition(updatePayload);
    }
  
    setEditingCell(null);
    setEditValue('');
  };

  /** Handles keyboard events for the in-line editor (Enter to save, Escape to cancel). */
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') setEditingCell(null);
  }

  /** Memoized calculation of the totals row to avoid re-computing on every render. */
  const totals = useMemo(() => {
    const total = positions.reduce((acc, pos) => {
      acc.salary += pos.salary;
      acc.totalSalary += pos.totalSalary;
      acc.overheadCost += pos.overheadCost;
      acc.revenue += pos.revenue;
      acc.profit += pos.profit;
      return acc;
    }, { salary: 0, totalSalary: 0, overheadCost: 0, revenue: 0, profit: 0 });

    const billablePositions = positions.filter(p => p.rate > 0);
    const totalPotentialRevenue = billablePositions.reduce((acc, p) => acc + (p.rate * 1540), 0); // Assuming 1540 billable hours/year
    const totalRate = billablePositions.reduce((acc, p) => acc + p.rate, 0);
    
    const avgRate = billablePositions.length > 0 ? totalRate / billablePositions.length : 0;
    const avgUtilization = totalPotentialRevenue > 0 ? (total.revenue / totalPotentialRevenue) * 100 : 0;
    const totalMargin = total.revenue > 0 ? (total.profit / total.revenue) * 100 : 0;

    return { ...total, avgUtilization, totalMargin, avgRate };
  }, [positions]);

  const headers = ['Role', 'Salary', 'Total Salary', 'Overhead Cost', 'Rate', 'Utilization', 'Revenue', 'Profit', 'Margin', 'Actions'];
  
  /** Renders a table cell, making it an input field if it's in edit mode. */
  const renderCell = (pos: Position, field: EditableField, displayValue: string) => {
    if (pos.roleType === 'nonBillable' && (field === 'rate' || field === 'utilization')) {
        return <div className="text-gray-500 px-2 py-1">—</div>;
    }
    
    if (editingCell?.id === pos.id && editingCell?.field === field) {
        return (
            <input
                type={field === 'role' ? 'text' : 'number'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                aria-label={`Edit ${field} for ${pos.role}`}
                className="w-full bg-brand-dark border border-brand-accent rounded px-2 py-1 -m-2"
            />
        );
    }
    return <div onClick={() => handleEdit(pos, field)} className="cursor-pointer h-full w-full border-b border-dashed border-brand-accent/40 hover:border-white transition-colors duration-200">{displayValue}</div>;
  };

  /** Defines the items for the actions dropdown menu. */
  const menuItems = (pos: Position) => [
      { label: 'Add Report', icon: UserPlusIcon, action: () => onAddSubordinate(pos.id) },
      { label: 'Edit', icon: PencilIcon, action: () => onEdit(pos) },
      { label: 'Duplicate', icon: DocumentDuplicateIcon, action: () => onDuplicate(pos) },
      { label: 'Delete', icon: TrashIcon, action: () => onDelete(pos.id), isDestructive: true },
  ];

  return (
    <div className="overflow-x-auto bg-brand-surface rounded-lg shadow-soft-glow border border-brand-border relative">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-black">
          <tr>
            {headers.map(header => <th key={header} scope="col" className="px-4 py-3 tracking-wider">{header}</th>)}
          </tr>
        </thead>
        <motion.tbody>
          <AnimatePresence>
          {positions.map(pos => (
            <motion.tr 
                key={pos.id} className="bg-brand-surface border-b border-brand-border hover:bg-gray-800/20 transition-colors"
                layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <td className="px-4 py-4 font-medium text-white">{renderCell(pos, 'role', pos.role)}</td>
              <td className="px-4 py-4">{renderCell(pos, 'salary', formatCurrency(pos.salary))}</td>
              <td className="px-4 py-4 text-gray-400">{formatCurrency(pos.totalSalary)}</td>
              <td className="px-4 py-4 text-gray-400">{formatCurrency(pos.overheadCost)}</td>
              <td className="px-4 py-4">{renderCell(pos, 'rate', formatCurrency(pos.rate))}</td>
              <td className="px-4 py-4">{renderCell(pos, 'utilization', formatPercent(pos.utilization))}</td>
              <td className="px-4 py-4 text-gray-400">{formatCurrency(pos.revenue)}</td>
              <td className={`px-4 py-4 font-semibold ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(pos.profit)}</td>
              <td className={`px-4 py-4 font-semibold ${pos.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(pos.margin)}</td>
              <td className="px-4 py-4 text-center">
                <div className="relative inline-block text-left">
                    <button 
                        id={`actions-menu-button-${pos.id}`}
                        aria-haspopup="true"
                        aria-expanded={activeMenu === pos.id}
                        aria-controls={`actions-menu-${pos.id}`}
                        aria-label={`Actions for ${pos.role}`}
                        onClick={() => setActiveMenu(activeMenu === pos.id ? null : pos.id)} 
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                     <AnimatePresence>
                        {activeMenu === pos.id && (
                            <motion.div 
                                ref={menuRef} 
                                id={`actions-menu-${pos.id}`}
                                role="menu"
                                aria-labelledby={`actions-menu-button-${pos.id}`}
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10"
                                initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.15 }}
                            >
                                <div className="py-1">
                                    {menuItems(pos).map(item => (
                                        <button key={item.label} onClick={() => { item.action(); setActiveMenu(null); }}
                                            role="menuitem"
                                            className={`w-full text-left flex items-center px-4 py-2 text-sm ${item.isDestructive ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                                        >
                                            <item.icon className={`w-4 h-4 mr-3 ${item.isDestructive ? '' : 'text-gray-400'}`} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </td>
            </motion.tr>
          ))}
          </AnimatePresence>
        </motion.tbody>
        {/* The table footer conditionally renders based on the `isUnlocked` state. */}
        {isUnlocked ? (
            <tfoot className="font-bold text-white bg-black/50">
                <tr>
                    <td className="px-4 py-4 align-bottom">Totals</td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Salary</div><div>{formatCurrency(totals.salary)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Total Salary</div><div>{formatCurrency(totals.totalSalary)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Overhead Cost</div><div>{formatCurrency(totals.overheadCost)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Avg. Rate</div><div>{formatCurrency(totals.avgRate)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Avg. Utilization</div><div>{formatPercent(totals.avgUtilization)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Revenue</div><div>{formatCurrency(totals.revenue)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Profit</div><div className={`${totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-300 mb-1">Margin</div><div className={`${totals.totalMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(totals.totalMargin)}</div></td>
                    <td className="px-4 py-4"></td>
                </tr>
            </tfoot>
        ) : (
            // A blurred, non-interactive version of the totals is shown to non-unlocked users.
            <tfoot className="font-bold text-white bg-black/50">
                <tr className="blur-md select-none pointer-events-none" aria-hidden="true">
                    <td className="px-4 py-4 align-bottom">Totals</td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Salary</div><div>$1,800,000</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Total Salary</div><div>$2,340,000</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Overhead Cost</div><div>$351,000</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Avg. Rate</div><div>$250</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Avg. Utilization</div><div>76%</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Revenue</div><div>$3,561,900</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Profit</div><div className="text-green-400">$870,900</div></td>
                    <td className="px-4 py-4"><div className="text-xs font-normal text-gray-400 mb-1">Margin</div><div className="text-green-400">24%</div></td>
                    <td className="px-4 py-4"></td>
                </tr>
            </tfoot>
        )}
      </table>
      {/* A call-to-action overlay appears at the bottom if the user has not unlocked the app. */}
      {!isUnlocked && (
        <div className="absolute inset-x-0 bottom-0 h-20 flex items-center justify-center p-4">
            <motion.button
                onClick={onUnlockRequest}
                className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center shadow-soft-glow-lg text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <SparklesIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-center">Unlock Full Financials & All Features</span>
            </motion.button>
        </div>
      )}
    </div>
  );
};

export default SummaryTable;