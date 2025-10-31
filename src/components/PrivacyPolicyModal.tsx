import React, { useRef } from 'react';
import { motion } from 'framer-motion'; // Removed Variants import as it's not needed directly here
import { useAccessibilityModal } from '../hooks/useAccessibilityModal';
import { backdropVariants, modalVariants } from '../utils/motionVariants'; // Import centralized variants

/**
 * @interface PrivacyPolicyModalProps
 * @description Defines the props for the PrivacyPolicyModal component.
 */
interface PrivacyPolicyModalProps {
    /** Flag indicating if the modal is currently open. Used for accessibility hooks. */
    isOpen: boolean;
    /** Callback function to close the modal. */
    onClose: () => void;
}

/**
 * @description A modal component that displays the application's privacy policy.
 * The content is hardcoded for simplicity.
 */
const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null); // Ref for the modal
    useAccessibilityModal(isOpen, onClose, modalRef); // Use the accessibility hook

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
            onClick={onClose} // Allow clicking backdrop to close
        >
            <motion.div
                ref={modalRef} // Attach the ref here
                role="dialog"
                aria-modal="true"
                aria-labelledby="privacy-modal-title"
                className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-2xl"
                variants={modalVariants}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                {/* The content container is scrollable for smaller viewports. */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <h3 id="privacy-modal-title" className="text-xl font-bold text-white mb-4">Privacy Policy</h3>
                    <div className="space-y-4 text-gray-300 text-sm">
                        <p><strong>Last Updated:</strong> July 26, 2024</p>
                        <p>
                            Welcome to TeamLedger. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information.
                        </p>

                        <h4 className="font-semibold text-white">1. Information We Collect</h4>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li>
                                <strong>Organizational Data:</strong> All organizational chart data you create (roles, salaries, etc.) is stored directly in your web browser's Local Storage. This data is not transmitted to or stored on our servers, except when you voluntarily use the AI Analysis feature.
                            </li>
                            <li>
                                <strong>Email Address:</strong> If you choose to unlock premium features, we collect your email address. This process is handled by a third-party service, Formspree.
                            </li>
                            <li>
                                <strong>Usage Data:</strong> We use third-party analytics services (Google Analytics, Amplitude, Microsoft Clarity) to collect anonymous data about your interaction with our site, such as pages visited, features used, and session duration. This helps us improve the application.
                            </li>
                        </ul>

                        <h4 className="font-semibold text-white">2. How We Use Your Information</h4>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li>To provide and maintain our service, including saving your work locally in your browser.</li>
                            <li>To provide the AI Analysis feature, which sends your anonymized organizational data to the Google Gemini API for processing.</li>
                            <li>To improve the application by analyzing usage patterns.</li>
                            <li>To communicate with you, such as notifying you of new feature releases if you have provided your email.</li>
                        </ul>

                        <h4 className="font-semibold text-white">3. Cookies and Local Storage</h4>
                        <p>
                            We use your browser's Local Storage to save your chart data and user preferences (like dismissing this cookie notice). Our third-party analytics partners may use cookies to help analyze traffic and usage patterns.
                        </p>

                        <h4 className="font-semibold text-white">4. Third-Party Services</h4>
                        <p>
                            We use the following third-party services:
                        </p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Google Analytics, Amplitude, Microsoft Clarity:</strong> For application usage analytics.</li>
                            <li><strong>Formspree:</strong> To collect email addresses for feature unlocking.</li>
                            <li><strong>Google Gemini API:</strong> To provide the AI Analysis feature.</li>
                            <li><strong>Userback:</strong> To collect user feedback.</li>
                        </ul>

                        <h4 className="font-semibold text-white">5. Data Security</h4>
                        <p>
                            Your primary organizational data is stored on your own device, which provides a strong layer of privacy. For data that is transmitted (e.g., for AI analysis or email submission), we use services that employ industry-standard security measures. However, no method of transmission or storage is 100% secure.
                        </p>

                        <h4 className="font-semibold text-white">6. Changes to This Policy</h4>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
                        </p>
                        
                        <h4 className="font-semibold text-white">7. Contact Us</h4>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us through the developer, <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Jeff Archibald</a>.
                        </p>
                    </div>
                </div>
                <div className="bg-gray-900/50 px-6 py-4 flex justify-end rounded-b-lg">
                    <motion.button
                        onClick={onClose}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Close
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PrivacyPolicyModal;