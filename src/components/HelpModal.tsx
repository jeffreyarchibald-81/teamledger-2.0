import React, { useRef } from 'react';
import { motion } from 'framer-motion'; // Added this import
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { UserPlusIcon, PencilIcon, TrashIcon, XIcon } from './icons'; // Added XIcon for dismiss button
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @description A modal that provides quick instructions on how to use the app.
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
                className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-lg"
                variants={modalVariants}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h3 id="help-modal-title" className="text-xl font-bold text-white">How to Use TeamLedger</h3>
                    {isShowingSampleData && (
                        <div className="mt-4 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm">
                            <p className="font-semibold">You're currently viewing a sample org chart.</p>
                            <p>Feel free to edit these roles, or use the "Actions" menu to delete them all and start fresh.</p>
                        </div>
                    )}
                    <ul className="space-y-3 mt-4 text-gray-300 list-disc list-inside">
                        <li><b>Build your chart:</b> Use the <UserPlusIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> <PencilIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> and <TrashIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> icons on each card to add, edit, or delete roles. The "Actions" menu also allows you to add roles and clear the chart.</li>
                        <li><b>Change views:</b> Toggle between the "Tree" and "List" views to see your structure differently.</li>
                        <li><b>Quick edits:</b> Click on any Role, Salary, Rate, or Utilization value in the Financial Breakdown table to edit it directly.</li>
                        <li><b>Global settings:</b> Adjust the company-wide multipliers for benefits and overhead in the "Settings" section.</li>
                        <li><b>Export & Share:</b> Use the "Actions" menu to get a shareable link or download your data as a PNG or CSV.</li>
                        <li><b>Get insights:</b> Use the AI Analysis section to get a strategic overview of your team structure.</li>
                    </ul>
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

export default HelpModal;