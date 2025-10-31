import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion'; // Added this import
import { useAuth } from '../auth';
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { SparklesIcon, CheckCircleIcon } from './icons';
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @description Modal for unlocking premium features by providing an email address.
 */
interface UnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUnlockSuccess: () => void;
}
const UnlockModal: React.FC<UnlockModalProps> = ({ isOpen, onClose, onUnlockSuccess }) => {
    const { unlockApp } = useAuth();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [apiError, setApiError] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status !== 'idle' || !email) return;

        // Use a more robust, industry-standard regex for client-side format validation.
        // This is a first line of defense. The ultimate validation (including MX records)
        // is handled by the backend service (FormSpree).
        const emailRegex = new RegExp(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );

        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError('');
        setApiError('');

        setStatus('submitting');
        const result = await unlockApp(email);
        if (result.success) {
            onUnlockSuccess();
        } else {
            setApiError(result.message || 'An unexpected error occurred. Please try again.');
            setStatus('idle');
        }
    };
    
    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose}
        >
          <motion.div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants} onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="px-6 pt-6 pb-4">
                <h3 id="unlock-modal-title" className="text-xl font-bold text-white">Unlock All Features</h3>
                <p className="text-gray-400 mt-2">Get the full picture. Unlock these powerful features by entering your email:</p>
                
                <ul className="space-y-3 mt-4 text-gray-300">
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Automatically save your work to this browser</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Unlock the complete financial breakdown</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Enable sharing & exporting</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Get custom AI insights and SWOT on your org structure so you can operate confidently</span></li>
                     <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Be notified of new feature releases</span></li>
                </ul>
                
                <div className="mt-6">
                  <label htmlFor="unlock-email" className="sr-only">Email Address</label>
                  <input
                      id="unlock-email"
                      type="email" value={email}
                      onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                          if (apiError) setApiError('');
                      }}
                      placeholder="your@email.com" required
                      aria-invalid={!!emailError || !!apiError}
                      aria-describedby="unlock-email-error"
                      className={`w-full bg-white border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:ring-2 focus:border-brand-accent ${emailError || apiError ? 'border-red-500 focus:ring-red-500' : 'border-brand-border focus:ring-brand-accent'}`}
                  />
                  {(emailError || apiError) && (
                    <p id="unlock-email-error" className="text-red-400 text-sm mt-1">
                      {emailError || apiError}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-gray-900/50 px-6 py-4 rounded-b-lg">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-start sm:items-center sm:space-x-4">
                  <motion.button 
                      type="submit" disabled={status === 'submitting' || !email} 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                      className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                      {status === 'submitting' ? 'Unlocking...' : 'Unlock Now'}
                      <SparklesIcon className="w-4 h-4 ml-2" />
                  </motion.button>
                  <motion.button 
                      type="button" whileHover={{ y: -2 }} whileTap={{ y: 0 }} 
                      onClick={onClose} className="text-gray-400 hover:text-white text-sm transition-colors font-semibold py-2 sm:py-0"
                  >
                      Cancel
                  </motion.button>
                </div>
                <p className="text-center text-gray-500 text-xs mt-4">No fees, no spam, and you can unsubscribe at any time.</p>
              </div>
            </form>
          </motion.div>
        </motion.div>
    );
};

export default UnlockModal;