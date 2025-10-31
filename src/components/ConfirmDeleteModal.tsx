import React, { useRef } from 'react';
import { motion } from 'framer-motion'; // Added this import
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @description A confirmation modal for the "Delete All" action.
 */
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
            onClick={onClose} // Allow clicking backdrop to close
        >
          <motion.div 
            ref={modalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-sm"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <div className="p-6">
              <h3 id="delete-modal-title" className="text-xl font-bold text-white">Confirm Deletion</h3>
              <p className="text-gray-400 mt-2">Are you sure you want to delete all positions? This action cannot be undone.</p>
            </div>
            <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete All</motion.button>
            </div>
          </motion.div>
        </motion.div>
    )
}

export default ConfirmDeleteModal;