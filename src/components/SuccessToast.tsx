import React from 'react';
import { motion } from 'framer-motion'; // Added this import
import { CheckCircleIcon } from './icons';

/**
 * @description A toast notification that appears on successful app unlock.
 */
const SuccessToast: React.FC = () => {
    return (
        <motion.div
            role="status"
            className="fixed bottom-5 right-5 bg-green-600/90 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center z-[100] backdrop-blur-sm border border-green-500"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-200" />
            <div>
                <p className="font-bold">App Unlocked!</p>
                <p className="text-sm text-green-100">Full features enabled & your work is now autosaved.</p>
            </div>
        </motion.div>
    );
};

export default SuccessToast;