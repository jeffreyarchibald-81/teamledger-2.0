import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; // Added this import
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { DocumentArrowDownIcon, PhotoIcon } from './icons';
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @description Modal for exporting data as a shareable link, CSV, or PNG.
 */
interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => { link: string; csv: string };
    onDownloadPng: () => Promise<void>;
    isPngExportAvailable: boolean;
}
const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, onDownloadPng, isPngExportAvailable }) => {
    const [shareableLink, setShareableLink] = useState('');
    const [csvData, setCsvData] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isGeneratingPng, setIsGeneratingPng] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    // Generate the export data when the modal opens.
    useEffect(() => {
        if (isOpen) { // Only generate when modal is open
            const { link, csv } = onConfirm();
            setShareableLink(link);
            setCsvData(csv);
        }
    }, [isOpen, onConfirm]); // Depend on isOpen to regenerate when it opens

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2500);
        });
    };

    const handleDownloadCsv = () => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'org-chart.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleDownloadPng = async () => {
        if (!isPngExportAvailable) return;
        setIsGeneratingPng(true);
        try {
            await onDownloadPng();
        } catch (error) {
            console.error("Failed to generate PNG:", error);
        } finally {
            setIsGeneratingPng(false);
        }
    };

    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
            onClick={onClose} // Allow clicking backdrop to close
        >
          <motion.div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <div className="p-6">
                <div className="text-left">
                    <h3 id="export-modal-title" className="text-xl font-bold text-white">Export & Share</h3>
                    <p className="text-gray-400 mt-2 mb-4">Here are your shareable link and export options.</p>
                    
                    <label htmlFor="shareable-link-input" className="block text-sm font-medium text-gray-300 mb-1">Shareable Link</label>
                    <div className="flex space-x-2">
                        <input
                            id="shareable-link-input"
                            type="text" readOnly value={shareableLink}
                            className="w-full bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                        />
                        <motion.button 
                            onClick={handleCopyLink} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                        </motion.button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {isPngExportAvailable && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadPng} disabled={isGeneratingPng} className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <PhotoIcon className="w-5 h-5 mr-2" />
                                {isGeneratingPng ? 'Generating...' : 'Download PNG'}
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadCsv} className="w-full flex justify-center items-center bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors">
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                            Download CSV
                        </motion.button>
                    </div>
                      <div className="mt-3">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Close
                        </motion.button>
                      </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
    )
}

export default ExportModal;