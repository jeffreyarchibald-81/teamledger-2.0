import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; // Removed Variants import as it's not needed directly here
import { Position, PositionInput, PositionUpdate } from '../types';
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @interface PositionEditorProps
 * @description Defines the props for the PositionEditor modal component.
 */
interface PositionEditorProps {
  /** Flag indicating if the modal is currently open. Used for accessibility hooks. */
  isOpen: boolean;
  /** Callback function to close the modal without saving. */
  onClose: () => void;
  /** Callback function to save the new or updated position data. */
  onSave: (position: PositionInput | PositionUpdate) => void;
  /** The position object to be edited. If null, the modal is in "add new" mode. */
  existingPosition: Position | null;
  /** The full list of positions, used to populate the manager dropdown. */
  positions: Position[];
  /** The ID of the parent position when creating a new subordinate role. */
  parentId?: string | null;
  /** The position object to use as a template when duplicating a role. */
  duplicateSource?: Position | null;
}

/**
 * @description A modal form component for creating, editing, and duplicating positions.
 * It handles all form state and logic internally.
 */
const PositionEditor: React.FC<PositionEditorProps> = ({ isOpen, onClose, onSave, existingPosition, positions, parentId, duplicateSource }) => {
  // State for each form field.
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [rate, setRate] = useState('');
  const [utilization, setUtilization] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [roleType, setRoleType] = useState<'billable' | 'nonBillable'>('billable');
  const modalRef = useRef<HTMLDivElement>(null); // Ref for the modal
  useAccessibilityModal(isOpen, onClose, modalRef); // Use the accessibility hook

  /**
   * Effect to populate the form fields based on the current mode (edit, duplicate, or create new).
   * This runs whenever the component opens or its mode changes.
   */
  useEffect(() => {
    if (existingPosition) { // Editing existing position
      setRole(existingPosition.role);
      setSalary(String(existingPosition.salary));
      setRate(String(existingPosition.rate));
      setUtilization(String(existingPosition.utilization));
      setManagerId(existingPosition.managerId);
      setRoleType(existingPosition.roleType || 'billable');
    } else if (duplicateSource) { // Duplicating a position
      setRole(duplicateSource.role);
      setSalary(String(duplicateSource.salary));
      setRate(String(duplicateSource.rate));
      setUtilization(String(duplicateSource.utilization));
      setManagerId(duplicateSource.managerId);
      setRoleType(duplicateSource.roleType || 'billable');
    } else { // Creating a new position
      setRole('');
      setSalary('');
      setRate('');
      setUtilization('');
      setManagerId(parentId || null);
      setRoleType('billable');
    }
  }, [existingPosition, parentId, duplicateSource]);
  
  /**
   * Effect to automatically reset rate and utilization when a role is set to "non-billable".
   */
  useEffect(() => {
    if (roleType === 'nonBillable') {
        setRate('0');
        setUtilization('0');
    }
  }, [roleType]);

  /**
   * Handles form submission, packages the form data, and calls the onSave callback.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isNonBillable = roleType === 'nonBillable';
    const positionData = {
      role,
      salary: parseFloat(salary) || 0,
      rate: isNonBillable ? 0 : parseFloat(rate) || 0,
      utilization: isNonBillable ? 0 : parseFloat(utilization) || 0,
      managerId,
      roleType,
    };

    if (existingPosition) {
      onSave({ ...positionData, id: existingPosition.id });
    } else {
      onSave(positionData);
    }
  };

  // Filter the list of available managers to prevent a position from being its own manager.
  const availableManagers = positions.filter(p => p.id !== existingPosition?.id);

  return (
    <motion.div 
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
        variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
        onClick={onClose} // Allow clicking backdrop to close
    >
      <motion.div 
        ref={modalRef} // Attach the ref here
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 id="editor-title" className="text-2xl font-bold text-white mb-6">{existingPosition ? 'Edit Position' : 'Add New Position'}</h2>
            <div className="space-y-4">
              <InputField id="role" label="Role Title" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g., Senior Developer" required />
              
              <div role="radiogroup" aria-labelledby="role-type-label">
                <span id="role-type-label" className="block text-sm font-medium text-gray-300 mb-2">Role Type</span>
                <div className="flex rounded-lg bg-gray-900 border border-brand-border p-1">
                  <button type="button" role="radio" aria-checked={roleType === 'billable'} onClick={() => setRoleType('billable')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${roleType === 'billable' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-800'}`}>
                    Billable
                  </button>
                  <button type="button" role="radio" aria-checked={roleType === 'nonBillable'} onClick={() => setRoleType('nonBillable')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${roleType === 'nonBillable' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-800'}`}>
                    Non-Billable
                  </button>
                </div>
              </div>

              <InputField id="salary" label="Salary ($)" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g., 90000" required />
              <InputField id="rate" label="Billable Rate ($/hr)" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g., 175" disabled={roleType === 'nonBillable'} />
              <InputField id="utilization" label="Utilization (%)" type="number" value={utilization} onChange={e => setUtilization(e.target.value)} placeholder="e.g., 75" disabled={roleType === 'nonBillable'} />
              
              <div>
                <label htmlFor="manager" className="block text-sm font-medium text-gray-300 mb-1">Manager</label>
                <select
                  id="manager"
                  value={managerId ?? ''}
                  onChange={e => setManagerId(e.target.value || null)}
                  className="w-full bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="">-- No Manager --</option>
                  {availableManagers.map(p => (
                    <option key={p.id} value={p.id}>{p.role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <motion.button type="button" onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors">Save</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/**
 * @interface InputFieldProps
 * @description Defines props for the reusable InputField component.
 */
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** The label text to display above the input field. */
    label: string;
    /** The id for the input, used to link the label. */
    id: string;
}

/**
 * @description A reusable, styled text input component with a label.
 */
const InputField: React.FC<InputFieldProps> = ({ id, label, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            id={id}
            {...props}
            className={`w-full border border-brand-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors ${props.disabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-900'}`}
        />
    </div>
);

export default PositionEditor;